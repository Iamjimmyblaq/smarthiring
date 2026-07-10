// Shared Gmail sender used by notification edge functions.
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const GOOGLE_MAIL_API_KEY = Deno.env.get("GOOGLE_MAIL_API_KEY");
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

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

export async function sendGmail(opts: SendOpts) {
  if (!GOOGLE_MAIL_API_KEY || !LOVABLE_API_KEY || !opts.to) {
    console.warn("sendGmail skipped: missing keys/recipient", { hasGmail: !!GOOGLE_MAIL_API_KEY, to: opts.to });
    return { ok: false, reason: "missing_config" };
  }
  const boundary = `bnd_${crypto.randomUUID()}`;
  const text = stripHtml(opts.text || opts.html);
  const html = opts.html || `<p>${escapeHtml(text).replace(/\n/g, "<br>")}</p>`;
  const headers = [
    `To: ${sanitizeHeader(opts.to)}`,
    opts.replyTo ? `Reply-To: ${sanitizeHeader(opts.replyTo)}` : "",
    `Subject: ${sanitizeHeader(opts.subject)}`,
    "MIME-Version: 1.0",
    opts.fromName ? `X-SmartHire-Sender: ${sanitizeHeader(opts.fromName)}` : "",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].filter(Boolean).join("\r\n");
  const body = [
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
  const raw = toBase64Url(headers + "\r\n" + body);
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
    const txt = await res.text();
    console.error("Gmail send failed", opts.to, res.status, txt);
    return { ok: false, status: res.status, error: txt };
  }
  return { ok: true };
}

export function baseLayout(inner: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#222;line-height:1.55">${inner}<p style="color:#777;font-size:13px;margin-top:32px">Sent from the SmartHire recruiting workspace.</p></div>`;
}