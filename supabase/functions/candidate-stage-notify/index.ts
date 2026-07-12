import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendQueuedEmail, baseLayout } from "../_shared/gmail.ts";
import { emitWebhook } from "../_shared/webhooks.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const COPY: Record<string, { subject: (j: string) => string; body: (n: string, j: string, c: string) => string }> = {
  screening: {
    subject: (j) => `Your application for ${j} is being reviewed`,
    body: (n, j, c) => `Hi ${n},\n\nThank you for applying for the ${j} role at ${c}. Your application has moved to our screening stage — our team is reviewing your profile and will be in touch shortly.`,
  },
  interview: {
    subject: (j) => `You've been shortlisted for ${j}`,
    body: (n, j, c) => `Hi ${n},\n\nGreat news — you've advanced to the interview stage for the ${j} role at ${c}. You'll receive interview details in a separate email.`,
  },
  offer: {
    subject: (j) => `Offer stage: ${j}`,
    body: (n, j, c) => `Hi ${n},\n\nCongratulations — the ${c} team is preparing an offer for the ${j} role. Expect the formal offer letter soon.`,
  },
  hired: {
    subject: (j) => `Welcome to ${j} 🎉`,
    body: (n, j, c) => `Hi ${n},\n\nWelcome aboard! We're thrilled to have you join ${c} as our new ${j}. Onboarding details are on the way.`,
  },
  rejected: {
    subject: (j) => `Update on your application for ${j}`,
    body: (n, j, c) => `Hi ${n},\n\nThank you for your interest in the ${j} role at ${c}. After careful consideration we've decided to move forward with other candidates. We appreciate the time you invested and wish you the best.`,
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { candidate_id, new_stage } = await req.json();
    if (!candidate_id || !new_stage) return new Response(JSON.stringify({ error: "missing fields" }), { status: 400, headers: cors });
    const copy = COPY[new_stage];
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: cand } = await admin.from("candidates").select("id, name, email, user_id, job_id, stage").eq("id", candidate_id).maybeSingle();
    if (!cand) return new Response(JSON.stringify({ error: "candidate not found" }), { status: 404, headers: cors });
    const { data: job } = await admin.from("jobs").select("title, company_name, hr_email").eq("id", cand.job_id).maybeSingle();
    const { data: rec } = await admin.from("profiles").select("email, hr_email, full_name, company_name").eq("id", cand.user_id).maybeSingle();
    const company = job?.company_name || rec?.company_name || "the hiring team";
    const jobTitle = job?.title || "the role";
    const hrEmail = job?.hr_email || rec?.hr_email || rec?.email || undefined;
    const fromName = rec?.full_name || company;

    await emitWebhook(cand.user_id, "candidate.stage_changed", { candidate_id: cand.id, job_id: cand.job_id, stage: new_stage });

    if (copy && cand.email) {
      const text = copy.body(cand.name || "there", jobTitle, company) + `\n\nBest,\n${company}`;
      const html = baseLayout(`<h2 style="margin:0 0 12px">${copy.subject(jobTitle)}</h2>${text.split("\n").filter(Boolean).map((p) => `<p>${p}</p>`).join("")}`);
      await sendQueuedEmail({
        userId: cand.user_id,
        idempotencyKey: `stage:${cand.id}:${new_stage}`,
        purpose: "stage_change",
        context: { candidate_id: cand.id, job_id: cand.job_id, new_stage },
        to: cand.email,
        subject: copy.subject(jobTitle),
        text, html, fromName, replyTo: hrEmail,
      });
    }
    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("candidate-stage-notify error", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
  }
});