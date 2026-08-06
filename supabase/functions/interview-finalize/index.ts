import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { baseLayout, sendQueuedEmail } from "../_shared/gmail.ts";
import { emitWebhook } from "../_shared/webhooks.ts";

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

interface Proctoring {
  durationSeconds?: number;
  cameraEnabled?: boolean;
  screenShared?: boolean;
  screenShareStops?: number;
  tabSwitches?: number;
  windowBlurSeconds?: number;
  motionSamples?: number;
  averageMotion?: number;
  peakMotion?: number;
  highMotionEvents?: number;
  awayFromFrameEvents?: number;
  awayFromFrameSeconds?: number;
  multipleFacesSuspected?: number;
  events?: { at: string; type: string; detail?: string }[];
}

function composureLabel(p: Proctoring | null) {
  if (!p) return { label: "Not captured", score: null as number | null };
  let score = 100;
  score -= Math.min(30, (p.tabSwitches ?? 0) * 6);
  score -= Math.min(25, (p.awayFromFrameEvents ?? 0) * 5);
  score -= Math.min(20, (p.highMotionEvents ?? 0) * 2);
  score -= (p.screenShared === false ? 10 : 0);
  score -= Math.min(15, (p.screenShareStops ?? 0) * 5);
  score = Math.max(0, Math.round(score));
  const label = score >= 85 ? "Excellent — calm and consistently present"
    : score >= 70 ? "Good — minor distractions detected"
    : score >= 50 ? "Fair — several attention lapses"
    : "Poor — significant proctoring flags";
  return { label, score };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { token, transcript, conversationId, proctoring } = await req.json() as {
      token: string; transcript: TranscriptTurn[]; conversationId?: string; proctoring?: Proctoring;
    };
    if (!token) return json({ error: "token required" }, 400);
    const turns = Array.isArray(transcript) ? transcript : [];
    const proctor: Proctoring | null = proctoring && typeof proctoring === "object" ? proctoring : null;
    const composure = composureLabel(proctor);

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
      scores: scores ? { ...scores, composure: composure.score } : (composure.score !== null ? { composure: composure.score } : null),
      summary,
      recommendation,
      sentiment,
      conversation_id: conversationId ?? null,
      proctoring: proctor,
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

    // Send notification emails via Gmail — queued + idempotent so a retry from the
    // interview room never double-sends, and failures land in the admin email log.
    let recruiterEmailOk = false;
    let recruiterEmailError: string | null = null;
    try {
      const companyName = job?.company_name || recruiter?.company_name || "the hiring team";
      const jobTitle = job?.title || "the role";
      const recruiterEmail = job?.hr_email || recruiter?.hr_email || recruiter?.email;
      const overall = scores?.overall ?? null;
      const recLabel = recommendation.replace(/_/g, " ");
      const scoreLine = overall !== null ? `Overall score: ${overall}/100 · Recommendation: ${recLabel}` : "";

      // Candidate email
      if (candidate?.email) {
        const subj = `Your interview for ${jobTitle} is complete`;
        const text = `Hi ${candidate.name || "there"},\n\nThanks for completing your AI interview for the ${jobTitle} role at ${companyName}. Your responses have been shared with the hiring team, and they'll be in touch about next steps.\n\nBest,\n${companyName} via SmartHire`;
        const html = baseLayout(`<h2 style="margin:0 0 12px">Interview complete</h2><p>Hi ${candidate.name || "there"},</p><p>Thanks for completing your AI interview for <strong>${jobTitle}</strong> at <strong>${companyName}</strong>. Your responses have been shared with the hiring team, and they'll be in touch about next steps.</p>`);
        await sendQueuedEmail({
          userId: session.user_id,
          idempotencyKey: `ai_interview_done_candidate:${session.id}`,
          purpose: "ai_interview_complete_candidate",
          context: { session_id: session.id, candidate_id: session.candidate_id },
          to: candidate.email, subject: subj, html, text, fromName: companyName, replyTo: recruiterEmail,
        });
      }

      // Recruiter email
      if (recruiterEmail) {
        const subj = `AI interview report: ${candidate?.name || "Candidate"} — ${jobTitle}`;
        const strengthsHtml = strengths.length ? `<ul>${strengths.map((s) => `<li>${s}</li>`).join("")}</ul>` : "<p><em>None captured</em></p>";
        const gapsHtml = gaps.length ? `<ul>${gaps.map((g) => `<li>${g}</li>`).join("")}</ul>` : "<p><em>None captured</em></p>";
        const mins = proctor?.durationSeconds ? Math.max(1, Math.round(proctor.durationSeconds / 60)) : null;
        const proctorRows: [string, string][] = proctor ? [
          ["Composure", `${composure.label}${composure.score !== null ? ` (${composure.score}/100)` : ""}`],
          ["Interview length", mins ? `${mins} min` : "n/a"],
          ["Camera", proctor.cameraEnabled ? "On for the full session" : "Not enabled"],
          ["Screen sharing", proctor.screenShared ? `Active${proctor.screenShareStops ? ` · stopped ${proctor.screenShareStops}x` : ""}` : "Not shared"],
          ["Camera movement", `avg ${Math.round(proctor.averageMotion ?? 0)} · peak ${Math.round(proctor.peakMotion ?? 0)} · ${proctor.highMotionEvents ?? 0} high-movement events`],
          ["Left camera frame", `${proctor.awayFromFrameEvents ?? 0} time(s)${proctor.awayFromFrameSeconds ? ` · ~${Math.round(proctor.awayFromFrameSeconds)}s total` : ""}`],
          ["Tab / window switches", `${proctor.tabSwitches ?? 0}${proctor.windowBlurSeconds ? ` · ~${Math.round(proctor.windowBlurSeconds)}s off-screen` : ""}`],
        ] : [];
        const proctorHtml = proctor
          ? `<h3>Proctoring report</h3><table style="width:100%;border-collapse:collapse;font-size:14px">${proctorRows.map(([k, v]) => `<tr><td style="padding:6px 0;color:#666;width:46%">${k}</td><td style="padding:6px 0"><strong>${v}</strong></td></tr>`).join("")}</table>${(proctor.events ?? []).length ? `<h4 style="margin:16px 0 6px">Flagged moments</h4><ul>${(proctor.events ?? []).slice(0, 25).map((ev) => `<li>${new Date(ev.at).toLocaleTimeString()} — ${ev.type}${ev.detail ? `: ${ev.detail}` : ""}</li>`).join("")}</ul>` : ""}`
          : "<h3>Proctoring report</h3><p><em>No proctoring data captured for this session.</em></p>";
        const transcriptHtml = turns.length
          ? `<h3>Candidate responses</h3>${turns.map((t) => `<p style="margin:6px 0"><strong>${t.role === "agent" ? "Interviewer" : candidate?.name || "Candidate"}:</strong> ${String(t.text).replace(/</g, "&lt;")}</p>`).join("")}`
          : "";
        const proctorText = proctorRows.map(([k, v]) => `${k}: ${v}`).join("\n");
        const text = `AI interview complete for ${candidate?.name || "candidate"} (${candidate?.email || "no email"}) — ${jobTitle}.\n\n${scoreLine}\n\nSummary: ${summary || "n/a"}\n\nStrengths: ${strengths.join("; ") || "n/a"}\nGaps: ${gaps.join("; ") || "n/a"}\n\nPROCTORING REPORT\n${proctorText || "No proctoring data captured."}\n\nRESPONSES\n${transcriptText || "n/a"}`;
        const html = `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:24px;color:#222"><h2 style="margin:0 0 8px">AI interview report</h2><p style="color:#666;margin:0 0 20px">${candidate?.name || "Candidate"} · ${jobTitle}</p>${overall !== null ? `<div style="padding:12px 16px;background:#f4f6fb;border-radius:8px;margin-bottom:16px"><strong>Overall:</strong> ${overall}/100 &nbsp;·&nbsp; <strong>Recommendation:</strong> ${recLabel}${scores ? ` &nbsp;·&nbsp; Comm ${scores.communication} · Tech ${scores.technical} · Confidence ${scores.confidence}` : ""}${composure.score !== null ? ` &nbsp;·&nbsp; Composure ${composure.score}` : ""}</div>` : ""}<h3>Summary</h3><p>${summary || "<em>No summary generated</em>"}</p><h3>Strengths</h3>${strengthsHtml}<h3>Gaps</h3>${gapsHtml}${proctorHtml}${transcriptHtml}<p style="color:#777;font-size:13px;margin-top:28px">Open the full transcript in SmartHire → Interviews → AI Sessions.</p></div>`;
        const res = await sendQueuedEmail({
          userId: session.user_id,
          idempotencyKey: `ai_interview_report:${session.id}`,
          purpose: "ai_interview_report",
          context: { session_id: session.id, candidate_id: session.candidate_id, job_id: session.job_id },
          to: recruiterEmail, subject: subj, html, text, replyTo: candidate?.email || undefined,
        });
        recruiterEmailOk = Boolean(res?.ok);
        if (!res?.ok) recruiterEmailError = String((res as { error?: unknown; reason?: unknown })?.error ?? (res as { reason?: unknown })?.reason ?? "Email provider rejected the report");
      } else {
        recruiterEmailError = "No recruiter or HR email is set for this job.";
      }
    } catch (e) {
      console.error("Notification email error", e);
      recruiterEmailError = e instanceof Error ? e.message : "Unknown email error";
    }

    try {
      await emitWebhook(session.user_id, "interview.completed", {
        session_id: session.id, candidate_id: session.candidate_id, job_id: session.job_id,
        scores, recommendation, summary,
      });
    } catch (e) { console.error("webhook error", e); }

    return json({ ok: true, recommendation, summary, scores, reportEmailed: recruiterEmailOk, reportEmailError: recruiterEmailError });
  } catch (e) {
    console.error("interview-finalize error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
