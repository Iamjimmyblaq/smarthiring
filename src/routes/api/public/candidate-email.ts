import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";
import { z } from "zod";
import { EmailAPIError, sendLovableEmail } from "@lovable.dev/email-js";

// Server-to-server relay used by the backend notification functions
// (stage changes, interview invites, assessments, reports). Only callers that
// hold EMAIL_RELAY_SECRET can send; the browser never reaches this.
const SENDER_DOMAIN = "notify.talenval.com";
const FROM_ADDRESS = "hello@talenval.com";

const Body = z.object({
  to: z.string().email().max(255),
  subject: z.string().min(1).max(300),
  html: z.string().min(1).max(200_000),
  text: z.string().max(100_000).optional(),
  fromName: z.string().max(120).optional(),
  replyTo: z.string().email().max(255).optional(),
  idempotencyKey: z.string().min(1).max(200),
  label: z.string().max(60).optional(),
});

const clean = (s: string) => s.replace(/["<>\r\n,;:]/g, " ").replace(/\s+/g, " ").trim();

export const Route = createFileRoute("/api/public/candidate-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["EMAIL_RELAY_SECRET"];
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!secret || !apiKey) return Response.json({ ok: false, error: "not_configured" }, { status: 500 });
        const got = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
        const a = Buffer.from(got);
        const b = Buffer.from(secret);
        if (a.length !== b.length || !timingSafeEqual(a, b)) return new Response("Unauthorized", { status: 401 });

        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ ok: false, error: "invalid_body" }, { status: 400 });
        const d = parsed.data;
        const name = d.fromName ? `${clean(d.fromName)} via Talenval` : "Talenval";

        try {
          await sendLovableEmail(
            {
              to: d.to,
              from: `"${name}" <${FROM_ADDRESS}>`,
              sender_domain: SENDER_DOMAIN,
              subject: d.subject,
              html: d.html,
              text: d.text || d.html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
              purpose: "transactional",
              label: d.label ?? "candidate-notification",
              idempotency_key: d.idempotencyKey,
              ...(d.replyTo ? { reply_to: d.replyTo } : {}),
            },
            { apiKey, sendUrl: process.env["LOVABLE_SEND_URL"] },
          );
          return Response.json({ ok: true });
        } catch (e) {
          if (e instanceof EmailAPIError) {
            if (e.code === "recipient_suppressed") return Response.json({ ok: false, error: "recipient_suppressed", permanent: true });
            console.error("candidate-email send failed", e.status, e.code);
            return Response.json({ ok: false, error: e.code ?? "send_failed", status: e.status }, { status: 502 });
          }
          console.error("candidate-email send error", e);
          return Response.json({ ok: false, error: "send_failed" }, { status: 502 });
        }
      },
    },
  },
});
