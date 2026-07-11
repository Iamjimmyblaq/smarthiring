import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
const ELEVENLABS_AGENT_ID = Deno.env.get("ELEVENLABS_AGENT_ID");

function parseElevenLabsError(input: string) {
  try {
    const parsed = JSON.parse(input) as { detail?: { code?: string; message?: string; status?: string } };
    return parsed.detail ?? null;
  } catch {
    return null;
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!ELEVENLABS_AGENT_ID) return json({ error: "ELEVENLABS_AGENT_ID not configured" }, 500);

    const { token } = await req.json();
    if (!token || typeof token !== "string") return json({ error: "token required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: session, error } = await admin
      .from("interview_sessions")
      .select("id, status, expires_at, candidate_id, job_id")
      .eq("token", token)
      .maybeSingle();
    if (error || !session) return json({ error: "Session not found" }, 404);
    if (new Date(session.expires_at) < new Date()) return json({ error: "Session expired" }, 410);
    if (session.status === "completed") return json({ error: "Session already completed" }, 410);

    const [{ data: cand }, { data: job }] = await Promise.all([
      admin.from("candidates").select("name, email").eq("id", session.candidate_id).maybeSingle(),
      admin.from("jobs").select("title, description, requirements, required_skills, company_name, min_years_experience").eq("id", session.job_id).maybeSingle(),
    ]);

    const candidateName = cand?.name || "the candidate";
    const jobTitle = job?.title || "this role";
    const companyName = job?.company_name || "our company";
    const skills = (job?.required_skills ?? []).join(", ") || "the required skills";

    const systemPrompt = `You are an AI hiring interviewer for ${companyName}. You are interviewing ${candidateName} for the role of ${jobTitle}.

ROLE CONTEXT
- Required skills: ${skills}
- Minimum experience: ${job?.min_years_experience ?? 0} years
- Description: ${(job?.description ?? "").slice(0, 800)}
- Requirements: ${(job?.requirements ?? "").slice(0, 800)}

YOUR JOB
1. Greet ${candidateName} warmly by name and explain this will be a 5–10 minute screening conversation.
2. Ask 5–7 targeted, conversational questions covering: background, hands-on experience with the required skills, a real example of solving a hard problem, motivation for this role, and one situational/behavioural question.
3. Ask follow-ups when answers are vague. Keep your turns short (1–2 sentences). Let the candidate talk most of the time.
4. Be warm, professional, encouraging. Never reveal you are evaluating them or share scores.
5. When done, thank them, tell them the recruiter will follow up by email, and end the call.

Do NOT lecture. Do NOT answer questions about salary or offer details — politely defer to the recruiter.`;

    const firstMessage = `Hi ${candidateName}! I'm an AI interviewer with ${companyName}, here to chat with you about the ${jobTitle} position. This should take about five to ten minutes — ready to get started?`;

    let conversationToken: string | null = null;
    let signedUrl: string | null = null;
    let tokenMode: "private_webrtc" | "private_websocket" | "public_agent_fallback" = "private_webrtc";

    if (ELEVENLABS_API_KEY) {
      const tokenRes = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${ELEVENLABS_AGENT_ID}`,
        { headers: { "xi-api-key": ELEVENLABS_API_KEY } },
      );
      if (tokenRes.ok) {
        const tokenPayload = await tokenRes.json();
        conversationToken = tokenPayload?.token ?? null;
      } else {
        const txt = await tokenRes.text();
        const detail = parseElevenLabsError(txt);
        console.error("ElevenLabs token error", tokenRes.status, txt);
        if (detail?.code === "unauthorized" && detail?.status === "missing_permissions") {
          const signedUrlRes = await fetch(
            `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${ELEVENLABS_AGENT_ID}`,
            { headers: { "xi-api-key": ELEVENLABS_API_KEY } },
          );
          if (signedUrlRes.ok) {
            const signedPayload = await signedUrlRes.json();
            signedUrl = signedPayload?.signed_url ?? null;
            tokenMode = "private_websocket";
          } else {
            const signedTxt = await signedUrlRes.text();
            const signedDetail = parseElevenLabsError(signedTxt);
            console.error("ElevenLabs signed URL error", signedUrlRes.status, signedTxt);
            return json({
              fallbackMode: "text_ai",
              reason: signedDetail?.message || detail.message || "The AI interview voice key is missing the required ElevenLabs agent permissions.",
              agentId: ELEVENLABS_AGENT_ID,
              tokenMode: "smart_fallback",
              overrides: {
                agent: {
                  prompt: { prompt: systemPrompt },
                  firstMessage,
                  language: "en",
                },
              },
              sessionId: session.id,
            });
          }
        } else {
          return json({ error: detail?.message || "Failed to get ElevenLabs conversation token" }, 502);
        }
      }
    } else {
      tokenMode = "public_agent_fallback";
    }

    await admin
      .from("interview_sessions")
      .update({ status: "live", started_at: new Date().toISOString(), agent_id: ELEVENLABS_AGENT_ID })
      .eq("id", session.id);

    return json({
      conversationToken,
      signedUrl,
      agentId: ELEVENLABS_AGENT_ID,
      tokenMode,
      overrides: {
        agent: {
          prompt: { prompt: systemPrompt },
          firstMessage,
          language: "en",
        },
      },
      sessionId: session.id,
    });
  } catch (e) {
    console.error("elevenlabs-token error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
