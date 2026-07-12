import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function hmac(secret: string, body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function emitWebhook(userId: string, event: string, data: Record<string, unknown>) {
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: eps } = await admin
      .from("webhook_endpoints")
      .select("id, url, secret, events, enabled")
      .eq("user_id", userId)
      .eq("enabled", true);
    if (!eps?.length) return;
    const eventId = crypto.randomUUID();
    const payload = { id: eventId, event, created_at: new Date().toISOString(), data };
    const body = JSON.stringify(payload);
    await Promise.all(eps.filter((e) => !e.events?.length || e.events.includes(event)).map(async (ep) => {
      const sig = await hmac(ep.secret, body);
      // Retry with exponential backoff (200ms, 800ms, 3200ms) on 5xx/network failures.
      let status = "delivered";
      let code: number | null = null;
      let attempts = 0;
      let respSnippet: string | null = null;
      for (attempts = 1; attempts <= 3; attempts++) {
        try {
          const res = await fetch(ep.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-SmartHire-Event": event,
              "X-SmartHire-Event-Id": eventId,
              "X-SmartHire-Signature": `sha256=${sig}`,
              "User-Agent": "SmartHire-Webhook/1.0",
            },
            body,
            signal: AbortSignal.timeout(10_000),
          });
          code = res.status;
          respSnippet = (await res.text().catch(() => "")).slice(0, 500);
          if (res.ok) { status = "delivered"; break; }
          status = "failed";
          if (res.status < 500) break; // don't retry 4xx
        } catch (e) {
          status = "failed";
          respSnippet = e instanceof Error ? e.message.slice(0, 500) : String(e).slice(0, 500);
        }
        await new Promise((r) => setTimeout(r, 200 * Math.pow(4, attempts - 1)));
      }
      await admin.from("webhook_deliveries").insert({
        endpoint_id: ep.id, user_id: userId, event, payload,
        status, response_code: code, attempts,
        response_body: respSnippet,
      });
    }));
  } catch (e) {
    console.error("emitWebhook error", e);
  }
}