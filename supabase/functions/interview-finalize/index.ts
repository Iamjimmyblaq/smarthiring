import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const GOOGLE_MAIL_API_KEY = Deno.env.get("GOOGLE_MAIL_API_KEY");
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface TranscriptTurn { role: "user" | "agent"; text: string; ts?: number }

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildMime(to: string, subject: string, html: string, text: string): string {
  const boundary = `bnd_${crypto.randomUUID()}`;
  return [
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    text,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "",
    html,
    "",
    `--${boundary}--`,
  ].join("\r\n");
}

async function sendGmail(to: string, subject: string, html: string, text: string) {
  if (!GOOGLE_MAIL_API_KEY || !LOVABLE_API_KEY || !to) {
    console.warn("sendGmail skipped: missing keys or recipient");
    return;
  }
  const raw = toBase64Url(buildMime(to, subject, html, text));
  const res = await fetch(`${GATEWAY_URL}/users/me/messages/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": GOOGLE_MAIL_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) {
    console.error("Gmail send failed", to, res.status, await res.text());
  }
}

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
      .select("title, required_skills, min_years_experience, requirements, company_name, hr_email")
      .eq("id", session.job_id)
      .maybeSingle();

    const { data: candidate } = await admin
      .from("candidates")
      .select("name, email")
      .eq("id", session.candidate_id)
      .maybeSingle();

    const { data: recruiter } = await admin
      .from("profiles")
      .select("email, hr_email, full_name, company_name")
      .eq("id", session.user_id)
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

    // Send notification emails via Gmail
    try {
      const companyName = job?.company_name || recruiter?.company_name || "the hiring team";
      const jobTitle = job?.title || "the role";
      const overall = scores?.overall ?? null;
      const recLabel = recommendation.replace(/_/g, " ");
      const scoreLine = overall !== null ? `Overall score: ${overall}/100 · Recommendation: ${recLabel}` : "";

      // Candidate email
      if (candidate?.email) {
        const subj = `Your interview for ${jobTitle} is complete`;
        const text = `Hi ${candidate.name || "there"},\n\nThanks for completing your AI interview for the ${jobTitle} role at ${companyName}. Your responses have been shared with the hiring team, and they'll be in touch about next steps.\n\nBest,\n${companyName} via SmartHire`;
        const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#222"><h2 style="margin:0 0 12px">Interview complete ✅</h2><p>Hi ${candidate.name || "there"},</p><p>Thanks for completing your AI interview for <strong>${jobTitle}</strong> at <strong>${companyName}</strong>. Your responses have been shared with the hiring team, and they'll be in touch about next steps.</p><p style="color:#777;font-size:13px;margin-top:32px">Powered by SmartHire</p></div>`;
        await sendGmail(candidate.email, subj, html, text);
      }

      // Recruiter email
      const recruiterEmail = job?.hr_email || recruiter?.hr_email || recruiter?.email;
      if (recruiterEmail) {
        const subj = `AI interview report: ${candidate?.name || "Candidate"} — ${jobTitle}`;
        const strengthsHtml = strengths.length ? `<ul>${strengths.map((s) => `<li>${s}</li>`).join("")}</ul>` : "<p><em>None captured</em></p>";
        const gapsHtml = gaps.length ? `<ul>${gaps.map((g) => `<li>${g}</li>`).join("")}</ul>` : "<p><em>None captured</em></p>";
        const text = `AI interview complete for ${candidate?.name || "candidate"} (${candidate?.email || "no email"}) — ${jobTitle}.\n\n${scoreLine}\n\nSummary: ${summary || "n/a"}\n\nStrengths: ${strengths.join("; ") || "n/a"}\nGaps: ${gaps.join("; ") || "n/a"}\n\nView the full transcript in SmartHire → Interviews → AI Sessions.`;
        const html = `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:24px;color:#222"><h2 style="margin:0 0 8px">AI interview report</h2><p style="color:#666;margin:0 0 20px">${candidate?.name || "Candidate"} · ${jobTitle}</p>${overall !== null ? `<div style="padding:12px 16px;background:#f4f6fb;border-radius:8px;margin-bottom:16px"><strong>Overall:</strong> ${overall}/100 &nbsp;·&nbsp; <strong>Recommendation:</strong> ${recLabel}${scores ? ` &nbsp;·&nbsp; Comm ${scores.communication} · Tech ${scores.technical} · Confidence ${scores.confidence}` : ""}</div>` : ""}<h3>Summary</h3><p>${summary || "<em>No summary generated</em>"}</p><h3>Strengths</h3>${strengthsHtml}<h3>Gaps</h3>${gapsHtml}<p style="color:#777;font-size:13px;margin-top:28px">Open the full transcript in SmartHire → Interviews → AI Sessions.</p></div>`;
        await sendGmail(recruiterEmail, subj, html, text);
      }
    } catch (e) {
      console.error("Notification email error", e);
    }

    return json({ ok: true, recommendation, summary, scores });
  } catch (e) {
    console.error("interview-finalize error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
