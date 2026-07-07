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
    const payload = { event, created_at: new Date().toISOString(), data };
    const body = JSON.stringify(payload);
    await Promise.all(eps.filter((e) => !e.events?.length || e.events.includes(event)).map(async (ep) => {
      const sig = await hmac(ep.secret, body);
      let status = "delivered";
      let code: number | null = null;
      try {
        const res = await fetch(ep.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-SmartHire-Event": event, "X-SmartHire-Signature": `sha256=${sig}` },
          body,
        });
        code = res.status;
        if (!res.ok) status = "failed";
      } catch (e) {
        status = "failed";
        console.error("webhook send error", ep.url, e);
      }
      await admin.from("webhook_deliveries").insert({
        endpoint_id: ep.id, user_id: userId, event, payload, status, response_code: code, attempts: 1,
      });
    }));
  } catch (e) {
    console.error("emitWebhook error", e);
  }
}