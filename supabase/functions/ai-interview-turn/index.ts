import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

type Turn = { role: "user" | "agent"; text: string; ts?: number };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeJson(text: string) {
  try {
    return JSON.parse(text) as { message?: string; complete?: boolean };
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as { message?: string; complete?: boolean };
    } catch {
      return null;
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { token, transcript } = await req.json() as { token?: string; transcript?: Turn[] };
    if (!token || typeof token !== "string") return json({ error: "token required" }, 400);
    if (!LOVABLE_API_KEY) return json({ error: "AI interview service is not configured" }, 500);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: session, error } = await admin
      .from("interview_sessions")
      .select("id, status, expires_at, candidate_id, job_id")
      .eq("token", token)
      .maybeSingle();
    if (error || !session) return json({ error: "Session not found" }, 404);
    if (new Date(session.expires_at).getTime() <= Date.now()) return json({ error: "Session expired" }, 410);
    if (session.status === "completed") return json({ error: "Session already completed" }, 410);

    const [{ data: candidate }, { data: job }] = await Promise.all([
      admin.from("candidates").select("name").eq("id", session.candidate_id).maybeSingle(),
      admin.from("jobs").select("title, description, requirements, required_skills, company_name, min_years_experience").eq("id", session.job_id).maybeSingle(),
    ]);

    const turns = Array.isArray(transcript) ? transcript.slice(-14) : [];
    const askedCount = turns.filter((t) => t.role === "agent").length;
    const candidateName = candidate?.name || "the candidate";
    const jobTitle = job?.title || "this role";
    const companyName = job?.company_name || "our company";

    const messages = [
      {
        role: "system",
        content: `You are a warm, professional AI hiring interviewer for ${companyName}. Interview ${candidateName} for ${jobTitle}. Ask one concise question at a time. Cover background, hands-on skills, problem solving, motivation, and one situational question. Ask follow-ups when answers are vague. After 5 to 7 interviewer turns, complete the interview. Return only JSON with keys message and complete.`,
      },
      {
        role: "user",
        content: `Role details:\nRequired skills: ${(job?.required_skills ?? []).join(", ") || "not specified"}\nMinimum experience: ${job?.min_years_experience ?? 0}\nDescription: ${(job?.description ?? "").slice(0, 1000)}\nRequirements: ${(job?.requirements ?? "").slice(0, 1000)}\n\nConversation so far:\n${turns.map((t) => `${t.role === "agent" ? "Interviewer" : "Candidate"}: ${t.text}`).join("\n") || "No turns yet."}\n\nInterviewer turns so far: ${askedCount}. ${askedCount >= 6 ? "Now thank the candidate and mark complete true." : "Return the next interviewer message and complete false."}`,
      },
    ];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages, response_format: { type: "json_object" } }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("AI interview turn error", aiRes.status, text);
      return json({ error: "AI interviewer could not respond. Please try again." }, aiRes.status);
    }

    const payload = await aiRes.json();
    const content = payload?.choices?.[0]?.message?.content ?? "";
    const parsed = safeJson(content);
    const message = parsed?.message?.trim() || (askedCount === 0
      ? `Hi ${candidateName}, thanks for joining. Could you briefly tell me about your background and what makes you a strong fit for the ${jobTitle} role?`
      : "Thank you. The hiring team will review your responses and follow up with next steps.");
    const complete = Boolean(parsed?.complete) || askedCount >= 6;

    if (session.status === "pending") {
      await admin.from("interview_sessions").update({ status: "live", started_at: new Date().toISOString() }).eq("id", session.id);
    }

    return json({ message, complete });
  } catch (e) {
    console.error("ai-interview-turn error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});