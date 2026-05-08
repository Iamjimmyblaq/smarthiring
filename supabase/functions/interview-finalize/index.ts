import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface TranscriptTurn { role: "user" | "agent"; text: string; ts?: number }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { token, transcript, conversationId } = await req.json() as {
      token: string; transcript: TranscriptTurn[]; conversationId?: string;
    };
    if (!token) return json({ error: "token required" }, 400);
    const turns = Array.isArray(transcript) ? transcript : [];

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: session, error } = await admin
      .from("interview_sessions")
      .select("id, candidate_id, job_id, user_id")
      .eq("token", token)
      .maybeSingle();
    if (error || !session) return json({ error: "Session not found" }, 404);

    const { data: job } = await admin
      .from("jobs")
      .select("title, required_skills, min_years_experience, requirements")
      .eq("id", session.job_id)
      .maybeSingle();

    const transcriptText = turns
      .map((t) => `${t.role === "agent" ? "Interviewer" : "Candidate"}: ${t.text}`)
      .join("\n")
      .slice(0, 16000);

    let scores: Record<string, number> | null = null;
    let summary = "";
    let recommendation = "review";
    let sentiment = "neutral";
    let strengths: string[] = [];
    let gaps: string[] = [];

    if (transcriptText.trim().length > 30 && LOVABLE_API_KEY) {
      const sys = `You evaluate candidate interview transcripts. Always use the score_interview tool. Scores are 0-100.`;
      const user = `ROLE: ${job?.title ?? ""}
REQUIRED SKILLS: ${(job?.required_skills ?? []).join(", ")}
MIN YEARS: ${job?.min_years_experience ?? 0}
REQUIREMENTS: ${(job?.requirements ?? "").slice(0, 1500)}

TRANSCRIPT:
${transcriptText}`;

      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "system", content: sys }, { role: "user", content: user }],
          tools: [{
            type: "function",
            function: {
              name: "score_interview",
              description: "Score the interview transcript.",
              parameters: {
                type: "object",
                properties: {
                  communication_score: { type: "number" },
                  confidence_score: { type: "number" },
                  technical_score: { type: "number" },
                  overall_score: { type: "number" },
                  sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
                  summary: { type: "string", description: "2-3 sentence recruiter-facing summary" },
                  strengths: { type: "array", items: { type: "string" } },
                  gaps: { type: "array", items: { type: "string" } },
                  recommendation: { type: "string", enum: ["strong_hire", "hire", "review", "no_hire"] },
                },
                required: ["communication_score","confidence_score","technical_score","overall_score","sentiment","summary","strengths","gaps","recommendation"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "score_interview" } },
        }),
      });

      if (aiRes.ok) {
        const data = await aiRes.json();
        const call = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
        if (call) {
          try {
            const parsed = JSON.parse(call);
            scores = {
              communication: parsed.communication_score,
              confidence: parsed.confidence_score,
              technical: parsed.technical_score,
              overall: parsed.overall_score,
            };
            summary = parsed.summary ?? "";
            recommendation = parsed.recommendation ?? "review";
            sentiment = parsed.sentiment ?? "neutral";
            strengths = parsed.strengths ?? [];
            gaps = parsed.gaps ?? [];
          } catch (e) {
            console.error("Failed to parse AI tool call", e);
          }
        }
      } else {
        console.error("AI gateway error", aiRes.status, await aiRes.text());
      }
    }

    await admin.from("interview_sessions").update({
      status: "completed",
      ended_at: new Date().toISOString(),
      transcript: turns,
      scores,
      summary,
      recommendation,
      sentiment,
      conversation_id: conversationId ?? null,
    }).eq("id", session.id);

    // Append AI-generated insights to candidate strengths/gaps for recruiter visibility
    if (strengths.length || gaps.length) {
      const { data: cand } = await admin
        .from("candidates")
        .select("strengths, gaps")
        .eq("id", session.candidate_id)
        .maybeSingle();
      const merge = (a: string[] | null, b: string[]) => Array.from(new Set([...(a ?? []), ...b])).slice(0, 12);
      await admin.from("candidates").update({
        strengths: merge(cand?.strengths ?? [], strengths.map((s) => `[AI interview] ${s}`)),
        gaps: merge(cand?.gaps ?? [], gaps.map((g) => `[AI interview] ${g}`)),
      }).eq("id", session.candidate_id);
    }

    return json({ ok: true, recommendation, summary, scores });
  } catch (e) {
    console.error("interview-finalize error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
