import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getPaystackConfig } from "../_shared/paystack.ts";
import { provisionPaidPlan } from "../_shared/provision.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

function hex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** HMAC-SHA512 of the raw body with the Paystack secret key, per Paystack docs. */
async function sign(secret: string, body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";

  const config = await getPaystackConfig();
  if (!config.secretKey) {
    console.error("paystack-webhook: no secret key configured");
    return new Response("not configured", { status: 500, headers: corsHeaders });
  }

  const expected = await sign(config.secretKey, raw);
  if (!signature || !timingSafeEqual(signature, expected)) {
    console.error("paystack-webhook: invalid signature");
    return new Response("invalid signature", { status: 401, headers: corsHeaders });
  }

  // deno-lint-ignore no-explicit-any
  let event: any;
  try { event = JSON.parse(raw); } catch { return new Response("bad json", { status: 400, headers: corsHeaders }); }

  // Acknowledge everything else so Paystack does not retry unrelated events.
  if (event?.event !== "charge.success") return new Response("ok", { status: 200, headers: corsHeaders });

  try {
    const d = event.data ?? {};
    const meta = d.metadata ?? {};
    const userId = meta.user_id;
    const reference = d.reference;
    if (!userId || !reference) {
      console.error("paystack-webhook: missing user_id/reference", { reference });
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    // Re-verify with Paystack directly — never trust the payload alone.
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${config.secretKey}` },
    });
    const verified = await verifyRes.json();
    if (!verified.status || verified.data?.status !== "success") {
      console.error("paystack-webhook: verify mismatch", { reference });
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await provisionPaidPlan(admin, {
      userId,
      tierKey: meta.tier_key || meta.plan || "pro",
      reference,
      customerCode: verified.data?.customer?.customer_code ?? null,
      currency: verified.data?.currency ?? null,
      amountPaidMajor: Number(verified.data?.amount ?? 0) / 100,
      metadata: meta,
      confirmedVia: "webhook",
    });

    return new Response("ok", { status: 200, headers: corsHeaders });
  } catch (e) {
    console.error("paystack-webhook error", e);
    return new Response("error", { status: 500, headers: corsHeaders });
  }
});
