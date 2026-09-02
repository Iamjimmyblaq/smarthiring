import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { baseLayout, sendQueuedEmail } from "../_shared/gmail.ts";
import { emitWebhook } from "../_shared/webhooks.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

interface SubmittedAnswer { question_id: string; selected: number | null; time_ms?: number }

interface Proctoring {
  durationSeconds?: number;
  cameraEnabled?: boolean;
  tabSwitches?: number;
  windowBlurSeconds?: number;
  fullscreenExits?: number;
  pasteAttempts?: number;
  copyAttempts?: number;
  rightClicks?: number;
  averageMotion?: number;
  peakMotion?: number;
  highMotionEvents?: number;
  awayFromFrameEvents?: number;
  awayFromFrameSeconds?: number;
  events?: { at: string; type: string; detail?: string }[];
}

/** Plagiarism / integrity heuristic: paste + copy attempts, off-screen time, absent face, impossibly fast answers. */
function integrity(p: Proctoring | null, answers: SubmittedAnswer[], durationMinutes: number) {
  const flags: Record<string, unknown> = {};
  let risk = 0;
  const paste = p?.pasteAttempts ?? 0;
  const copy = p?.copyAttempts ?? 0;
  const tabs = p?.tabSwitches ?? 0;
  const away = p?.awayFromFrameEvents ?? 0;
  const blur = p?.windowBlurSeconds ?? 0;
  const fastAnswers = answers.filter((a) => (a.time_ms ?? 99999) < 2000).length;

  if (paste > 0) { flags.paste_blocked = paste; risk += Math.min(35, paste * 12); }
  if (copy > 0) { flags.copy_attempts = copy; risk += Math.min(15, copy * 5); }
  if (tabs > 0) { flags.tab_switches = tabs; risk += Math.min(25, tabs * 7); }
  if (blur > 20) { flags.off_screen_seconds = Math.round(blur); risk += Math.min(15, Math.round(blur / 20) * 5); }
  if (away > 0) { flags.left_camera_frame = away; risk += Math.min(20, away * 6); }
  if (p?.cameraEnabled === false) { flags.camera_off = true; risk += 25; }
  if (p?.fullscreenExits) { flags.fullscreen_exits = p.fullscreenExits; risk += Math.min(10, p.fullscreenExits * 4); }
  if (fastAnswers >= Math.max(3, Math.ceil(answers.length / 3))) { flags.suspiciously_fast_answers = fastAnswers; risk += 15; }
  if ((p?.durationSeconds ?? 0) > 0 && p!.durationSeconds! < durationMinutes * 60 * 0.15) {
    flags.completed_unrealistically_fast = true; risk += 10;
  }

  const score = Math.min(100, Math.round(risk));
  const verdict = score >= 60 ? "high risk" : score >= 30 ? "review recommended" : "clean";
  return { flags: { ...flags, verdict }, score };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { token, answers, proctoring } = await req.json() as {
      token: string; answers: SubmittedAnswer[]; proctoring?: Proctoring;
    };
    if (!token) return json({ error: "token required" }, 400);
    const submitted = Array.isArray(answers) ? answers : [];
    const proctor = proctoring && typeof proctoring === "object" ? proctoring : null;

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: a } = await admin
      .from("skill_test_assignments")
      .select("id, status, test_id, candidate_id, job_id, user_id")
      .eq("token", token)
      .maybeSingle();
    if (!a) return json({ error: "This assessment link is not valid." }, 404);
    if (a.status === "submitted") return json({ ok: true, alreadySubmitted: true });

    const { data: test } = await admin.from("skill_tests").select("*").eq("id", a.test_id).maybeSingle();
    const { data: bank } = await admin
      .from("skill_test_questions").select("id, position, prompt, options, correct_option, explanation, points")
      .eq("test_id", a.test_id).order("position");
    const questions = bank ?? [];

    let score = 0;
    let maxScore = 0;
    const graded = questions.map((q) => {
      const given = submitted.find((s) => s.question_id === q.id);
      const selected = given?.selected ?? null;
      const correct = selected !== null && selected === q.correct_option;
      maxScore += q.points ?? 1;
      if (correct) score += q.points ?? 1;
      return {
        question_id: q.id,
        prompt: q.prompt,
        selected,
        selected_text: selected !== null ? (q.options as string[])?.[selected] ?? null : null,
        correct_option: q.correct_option,
        correct_text: q.correct_option !== null ? (q.options as string[])?.[q.correct_option] ?? null : null,
        correct,
        explanation: q.explanation,
        time_ms: given?.time_ms ?? null,
      };
    });
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 1000) / 10 : 0;
    const check = integrity(proctor, submitted, test?.duration_minutes ?? 20);

    await admin.from("skill_test_assignments").update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      score, max_score: maxScore, percentage,
      answers: graded,
      proctoring: proctor,
      integrity_flags: check.flags,
      plagiarism_score: check.score,
    }).eq("id", a.id);

    // Recruiter report — queued so a failure retries and shows in the email log.
    let reportEmailed = false;
    let reportEmailError: string | null = null;
    try {
      const { data: candidate } = await admin.from("candidates").select("name, email").eq("id", a.candidate_id).maybeSingle();
      const { data: job } = a.job_id
        ? await admin.from("jobs").select("title, company_name, hr_email").eq("id", a.job_id).maybeSingle()
        : { data: null };
      const { data: profile } = await admin.from("profiles").select("email, hr_email, company_name").eq("id", a.user_id).maybeSingle();
      const recruiterEmail = job?.hr_email || profile?.hr_email || profile?.email;

      if (recruiterEmail) {
        const rows: [string, string][] = [
          ["Score", `${score}/${maxScore} (${percentage}%)`],
          ["Integrity check", `${check.flags.verdict} · risk ${check.score}/100`],
          ["Camera", proctor?.cameraEnabled ? "On for the full test" : "Not enabled"],
          ["Paste attempts blocked", String(proctor?.pasteAttempts ?? 0)],
          ["Tab / window switches", `${proctor?.tabSwitches ?? 0}${proctor?.windowBlurSeconds ? ` · ~${Math.round(proctor.windowBlurSeconds)}s off-screen` : ""}`],
          ["Left camera frame", `${proctor?.awayFromFrameEvents ?? 0} time(s)`],
          ["Camera movement", `avg ${Math.round(proctor?.averageMotion ?? 0)} · peak ${Math.round(proctor?.peakMotion ?? 0)} · ${proctor?.highMotionEvents ?? 0} high-movement events`],
          ["Duration", proctor?.durationSeconds ? `${Math.max(1, Math.round(proctor.durationSeconds / 60))} min` : "n/a"],
        ];
        const subject = `Assessment result: ${candidate?.name || "Candidate"} — ${test?.title ?? "Skills test"} (${percentage}%)`;
        const text = `${candidate?.name || "Candidate"} completed ${test?.title ?? "a skills test"}.\n\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nQUESTION BREAKDOWN\n${graded.map((g, i) => `${i + 1}. ${g.correct ? "CORRECT" : "WRONG"} — ${g.prompt}\n   answered: ${g.selected_text ?? "no answer"}\n   correct: ${g.correct_text ?? "n/a"}`).join("\n")}`;
        const html = baseLayout(
          `<h2 style="margin:0 0 6px">Assessment result</h2><p style="color:#666;margin:0 0 18px">${candidate?.name || "Candidate"} · ${test?.title ?? "Skills test"}${job?.title ? ` · ${job.title}` : ""}</p>` +
          `<div style="padding:12px 16px;background:#f4f6fb;border-radius:8px;margin-bottom:16px"><strong>${score}/${maxScore}</strong> &nbsp;·&nbsp; ${percentage}% &nbsp;·&nbsp; integrity: <strong>${check.flags.verdict}</strong></div>` +
          `<h3>Proctoring &amp; integrity</h3><table style="width:100%;border-collapse:collapse;font-size:14px">${rows.map(([k, v]) => `<tr><td style="padding:6px 0;color:#666;width:48%">${k}</td><td style="padding:6px 0"><strong>${v}</strong></td></tr>`).join("")}</table>` +
          `<h3>Question breakdown</h3>${graded.map((g, i) => `<p style="margin:8px 0"><strong>${i + 1}. ${g.correct ? "✅" : "❌"}</strong> ${String(g.prompt).replace(/</g, "&lt;")}<br><span style="color:#666">Answered: ${String(g.selected_text ?? "no answer").replace(/</g, "&lt;")}${g.correct ? "" : ` · Correct: ${String(g.correct_text ?? "n/a").replace(/</g, "&lt;")}`}</span></p>`).join("")}`,
        );
        const res = await sendQueuedEmail({
          userId: a.user_id,
          idempotencyKey: `skill_test_result:${a.id}`,
          purpose: "skill_test_result",
          context: { assignment_id: a.id, candidate_id: a.candidate_id, percentage },
          to: recruiterEmail, subject, html, text, replyTo: candidate?.email || undefined,
        });
        reportEmailed = Boolean(res?.ok);
        if (!res?.ok) reportEmailError = "The result email is queued for automatic retry.";
      } else {
        reportEmailError = "No recruiter or HR email is set for this job.";
      }
    } catch (e) {
      console.error("assessment email error", e);
      reportEmailError = e instanceof Error ? e.message : "Unknown email error";
    }

    try {
      await emitWebhook(a.user_id, "assessment.completed", {
        assignment_id: a.id, candidate_id: a.candidate_id, job_id: a.job_id,
        test: test?.title, score, max_score: maxScore, percentage,
        integrity: check.flags, plagiarism_score: check.score,
      });
    } catch (e) { console.error("webhook error", e); }

    return json({ ok: true, score, max_score: maxScore, percentage, reportEmailed, reportEmailError });
  } catch (e) {
    console.error("skill-test-submit error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
