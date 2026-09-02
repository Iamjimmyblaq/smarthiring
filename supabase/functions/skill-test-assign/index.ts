import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { baseLayout, sendQueuedEmail } from "../_shared/gmail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { candidateId, testId, origin } = await req.json();
    if (!candidateId || !testId) return json({ error: "candidateId and testId are required" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: candidate } = await admin
      .from("candidates").select("id, name, email, job_id, user_id").eq("id", candidateId).maybeSingle();
    if (!candidate || candidate.user_id !== user.id) return json({ error: "Candidate not found" }, 404);

    const { data: test } = await admin
      .from("skill_tests").select("id, title, duration_minutes, question_count, proctored").eq("id", testId).maybeSingle();
    if (!test) return json({ error: "Test not found" }, 404);

    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    const { data: assignment, error } = await admin.from("skill_test_assignments").insert({
      user_id: user.id,
      candidate_id: candidate.id,
      job_id: candidate.job_id,
      test_id: test.id,
      token,
    }).select("id, token, expires_at").single();
    if (error) return json({ error: error.message }, 500);

    const { data: job } = candidate.job_id
      ? await admin.from("jobs").select("title, company_name, hr_email").eq("id", candidate.job_id).maybeSingle()
      : { data: null };
    const { data: profile } = await admin.from("profiles").select("company_name, hr_email, email").eq("id", user.id).maybeSingle();

    const base = typeof origin === "string" && origin.startsWith("http") ? origin.replace(/\/$/, "") : "https://smarthiring.lovable.app";
    const link = `${base}/assessment/${token}`;
    const company = job?.company_name || profile?.company_name || "the hiring team";

    if (candidate.email) {
      const subject = `Your ${test.title} assessment${job?.title ? ` — ${job.title}` : ""}`;
      const text = `Hi ${candidate.name || "there"},\n\n${company} has invited you to complete the ${test.title} assessment (${test.duration_minutes} minutes, ${test.question_count} questions).\n\nStart here: ${link}\n\nThe test is timed and webcam proctored — please use a quiet room, a working camera and a stable connection. The link expires in 14 days and can only be used once.\n\nGood luck,\n${company} via SmartHire`;
      const html = baseLayout(`<h2 style="margin:0 0 12px">${test.title}</h2><p>Hi ${candidate.name || "there"},</p><p><strong>${company}</strong> has invited you to complete the <strong>${test.title}</strong> assessment${job?.title ? ` for the ${job.title} role` : ""}.</p><p>${test.duration_minutes} minutes · ${test.question_count} questions${test.proctored ? " · webcam proctored" : ""}</p><p style="margin:24px 0"><a href="${link}" style="background:#2563eb;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;display:inline-block">Start assessment</a></p><p style="font-size:13px;color:#666">The link expires in 14 days and can only be used once. Please use a quiet room with a working camera.</p>`);
      await sendQueuedEmail({
        userId: user.id,
        idempotencyKey: `skill_test_invite:${assignment.id}`,
        purpose: "skill_test_invite",
        context: { assignment_id: assignment.id, candidate_id: candidate.id, test_id: test.id },
        to: candidate.email, subject, html, text, fromName: company,
        replyTo: job?.hr_email || profile?.hr_email || profile?.email || undefined,
      });
    }

    return json({ ok: true, assignment_id: assignment.id, link, emailed: Boolean(candidate.email) });
  } catch (e) {
    console.error("skill-test-assign error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
