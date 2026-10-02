// Shared Gmail sender used by notification edge functions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const GOOGLE_MAIL_API_KEY = Deno.env.get("GOOGLE_MAIL_API_KEY");
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAX_ATTEMPTS = 3;

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]/g, " ").trim();
}

interface SendOpts {
  to: string;
  subject: string;
  html: string;
  text: string;
  fromName?: string;
  replyTo?: string;
}

interface QueuedSendOpts extends SendOpts {
  userId: string;
  idempotencyKey: string;
  purpose: string; // 'stage_change' | 'interview_scheduled' | 'ai_interview'
  context?: Record<string, unknown>;
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Candidate/HR emails now send from hello@talenval.com (verified domain
// notify.talenval.com) through the app's server relay. Reply-To is the HR.
const RELAY_URL = Deno.env.get("EMAIL_RELAY_URL") || "https://talenval.com/api/public/candidate-email";
const EMAIL_RELAY_SECRET = Deno.env.get("EMAIL_RELAY_SECRET");

export async function sendGmail(opts: SendOpts & { idempotencyKey?: string; label?: string }) {
  if (!EMAIL_RELAY_SECRET || !opts.to) {
    console.warn("email send skipped: missing relay secret/recipient");
    return { ok: false, reason: "missing_config" };
  }
  const text = opts.text || stripHtml(opts.html);
  const html = opts.html || `<p>${escapeHtml(text).replace(/\n/g, "<br>")}</p>`;
  const replyTo = opts.replyTo && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(opts.replyTo) ? opts.replyTo : undefined;
  const res = await fetch(RELAY_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${EMAIL_RELAY_SECRET}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      to: sanitizeHeader(opts.to),
      subject: sanitizeHeader(opts.subject),
      html, text,
      fromName: opts.fromName ? sanitizeHeader(opts.fromName) : undefined,
      replyTo,
      idempotencyKey: opts.idempotencyKey || crypto.randomUUID(),
      label: opts.label,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.ok) {
    console.error("Email send failed", res.status, body?.error);
    return { ok: false, status: res.status, error: String(body?.error ?? res.status) };
  }
  return { ok: true };
}

/**
 * Idempotent queued email send.
 * - Uses (user_id, idempotency_key) unique constraint: a duplicate call is a no-op.
 * - On failure, records attempts + next_retry_at with exponential backoff.
 * - On success, marks status=sent.
 * Callers should pass a stable idempotency_key like `stage:<candidate_id>:<new_stage>`.
 */
export async function sendQueuedEmail(opts: QueuedSendOpts) {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Reserve the delivery row; ON CONFLICT DO NOTHING guarantees single-shot per key.
  const { data: reserved, error: reserveErr } = await admin
    .from("email_deliveries")
    .upsert(
      {
        user_id: opts.userId,
        idempotency_key: opts.idempotencyKey,
        recipient: opts.to,
        subject: opts.subject,
        purpose: opts.purpose,
        context: opts.context ?? {},
        status: "pending",
      },
      { onConflict: "user_id,idempotency_key", ignoreDuplicates: true },
    )
    .select("id, status, attempts")
    .maybeSingle();

  if (reserveErr) {
    console.error("email_deliveries reserve error", reserveErr);
  }

  // If nothing came back, a prior row already exists — check its status.
  let row = reserved;
  if (!row) {
    const { data: existing } = await admin
      .from("email_deliveries")
      .select("id, status, attempts")
      .eq("user_id", opts.userId)
      .eq("idempotency_key", opts.idempotencyKey)
      .maybeSingle();
    row = existing;
    if (existing?.status === "sent") return { ok: true, deduped: true };
    if ((existing?.attempts ?? 0) >= MAX_ATTEMPTS) return { ok: false, reason: "max_attempts" };
  }

  const result = await sendGmail(opts);
  const attempts = (row?.attempts ?? 0) + 1;

  if (result.ok) {
    await admin.from("email_deliveries")
      .update({ status: "sent", attempts, sent_at: new Date().toISOString(), last_error: null, provider_status: 200 })
      .eq("id", row?.id);
    return { ok: true };
  }

  const done = attempts >= MAX_ATTEMPTS;
  const backoffMin = Math.pow(2, attempts) * 5; // 10m, 20m, 40m
  await admin.from("email_deliveries")
    .update({
      status: done ? "failed" : "pending",
      attempts,
      last_error: String(result.error ?? result.reason ?? "unknown"),
      provider_status: result.status ?? null,
      next_retry_at: done ? null : new Date(Date.now() + backoffMin * 60_000).toISOString(),
    })
    .eq("id", row?.id);
  return { ok: false, ...result };
}

export function baseLayout(inner: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#222;line-height:1.55">${inner}<p style="color:#777;font-size:13px;margin-top:32px">Sent from the Talenval recruiting workspace.</p></div>`;
}