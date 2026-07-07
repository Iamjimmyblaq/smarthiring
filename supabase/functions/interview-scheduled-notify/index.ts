import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendGmail, baseLayout } from "../_shared/gmail.ts";
import { emitWebhook } from "../_shared/webhooks.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") || "https://smarthiring.lovable.app";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { kind, interview_id, session_id } = await req.json();
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    if (kind === "human" && interview_id) {
      const { data: iv } = await admin.from("interviews").select("*").eq("id", interview_id).maybeSingle();
      if (!iv) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: cors });
      const { data: cand } = await admin.from("candidates").select("name, email, user_id, job_id").eq("id", iv.candidate_id).maybeSingle();
      if (!cand?.email) return new Response(JSON.stringify({ ok: true, skipped: "no candidate email" }), { headers: cors });
      const { data: job } = await admin.from("jobs").select("title, company_name, hr_email").eq("id", cand.job_id).maybeSingle();
      const { data: rec } = await admin.from("profiles").select("email, hr_email, full_name, company_name").eq("id", cand.user_id).maybeSingle();
      const company = job?.company_name || rec?.company_name || "the hiring team";
      const jobTitle = job?.title || "the role";
      const hrEmail = job?.hr_email || rec?.hr_email || rec?.email;
      const when = new Date(iv.scheduled_at).toLocaleString();
      const subj = `Interview scheduled: ${jobTitle} — ${when}`;
      const meetingLine = iv.meeting_link ? `\nMeeting link: ${iv.meeting_link}` : "";
      const text = `Hi ${cand.name || "there"},\n\nYour interview for ${jobTitle} at ${company} is scheduled for ${when} (${iv.duration_minutes || 45} min, ${iv.interview_type || "virtual"}).${iv.interviewer ? `\nInterviewer: ${iv.interviewer}` : ""}${meetingLine}\n\nPlease reply to this email if you need to reschedule.\n\nBest,\n${company}`;
      const html = baseLayout(`<h2 style="margin:0 0 12px">Interview scheduled</h2><p>Hi ${cand.name || "there"},</p><p>Your interview for <strong>${jobTitle}</strong> at <strong>${company}</strong> is scheduled for:</p><div style="padding:12px 16px;background:#f4f6fb;border-radius:8px;margin:12px 0"><strong>${when}</strong><br/>${iv.duration_minutes || 45} minutes · ${iv.interview_type || "virtual"}${iv.interviewer ? ` · with ${iv.interviewer}` : ""}</div>${iv.meeting_link ? `<p><a href="${iv.meeting_link}">Join meeting</a></p>` : ""}<p>Reply to this email if you need to reschedule.</p>`);
      await sendGmail({ to: cand.email, subject: subj, text, html, fromName: rec?.full_name || company, replyTo: hrEmail });
      await emitWebhook(cand.user_id, "interview.scheduled", { interview_id, candidate_id: cand.id, scheduled_at: iv.scheduled_at });
    }

    if (kind === "ai" && session_id) {
      const { data: s } = await admin.from("interview_sessions").select("*").eq("id", session_id).maybeSingle();
      if (!s) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: cors });
      const { data: cand } = await admin.from("candidates").select("name, email, user_id, job_id").eq("id", s.candidate_id).maybeSingle();
      if (!cand?.email) return new Response(JSON.stringify({ ok: true, skipped: "no candidate email" }), { headers: cors });
      const { data: job } = await admin.from("jobs").select("title, company_name, hr_email").eq("id", cand.job_id).maybeSingle();
      const { data: rec } = await admin.from("profiles").select("email, hr_email, full_name, company_name").eq("id", cand.user_id).maybeSingle();
      const company = job?.company_name || rec?.company_name || "the hiring team";
      const jobTitle = job?.title || "the role";
      const hrEmail = job?.hr_email || rec?.hr_email || rec?.email;
      const link = `${SITE_URL}/interview/${s.token}`;
      const subj = `Complete your AI interview for ${jobTitle}`;
      const expiresLine = s.expires_at ? `\nLink expires: ${new Date(s.expires_at).toLocaleString()}` : "";
      const text = `Hi ${cand.name || "there"},\n\n${company} has invited you to complete a short AI-powered interview for the ${jobTitle} role.\n\nStart here: ${link}${expiresLine}\n\nAllow 10–15 minutes in a quiet space with a working microphone. You'll speak with an AI interviewer; your responses are shared with the hiring team.\n\nBest,\n${company}`;
      const html = baseLayout(`<h2 style="margin:0 0 12px">Your AI interview is ready</h2><p>Hi ${cand.name || "there"},</p><p><strong>${company}</strong> has invited you to complete a short AI-powered interview for the <strong>${jobTitle}</strong> role.</p><p style="margin:24px 0"><a href="${link}" style="background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Start interview</a></p><p style="color:#555;font-size:14px">Or copy this link: <a href="${link}">${link}</a></p>${s.expires_at ? `<p style="color:#555;font-size:13px">Link expires: ${new Date(s.expires_at).toLocaleString()}</p>` : ""}<p>Allow 10–15 minutes in a quiet space with a working microphone.</p>`);
      await sendGmail({ to: cand.email, subject: subj, text, html, fromName: rec?.full_name || company, replyTo: hrEmail });
      await emitWebhook(cand.user_id, "interview.ai_session_created", { session_id, candidate_id: cand.id, interview_url: link });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("interview-scheduled-notify error", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
  }
});