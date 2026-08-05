import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const mask = (v: string | null) => (v ? `${v.slice(0, 7)}${"•".repeat(8)}${v.slice(-4)}` : null);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin" || r.role === "super_admin");
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const action = (body.action as string) || "get";

    if (action === "save") {
      const patch: Record<string, unknown> = {
        provider: "paystack",
        currency: (body.currency as string) || "USD",
        live_mode: Boolean(body.live_mode),
        updated_by: userData.user.id,
        updated_at: new Date().toISOString(),
      };
      if (typeof body.public_key === "string" && body.public_key.trim()) patch.public_key = body.public_key.trim();
      if (typeof body.secret_key === "string" && body.secret_key.trim()) patch.secret_key = body.secret_key.trim();

      const { error } = await admin.from("payment_settings").upsert(patch, { onConflict: "provider" });
      if (error) return json({ error: error.message }, 500);
    }

    if (action === "test") {
      const { data: row } = await admin
        .from("payment_settings").select("secret_key").eq("provider", "paystack").maybeSingle();
      const key = row?.secret_key || Deno.env.get("PAYSTACK_SECRET_KEY");
      if (!key) return json({ tested: true, ok: false, message: "No Paystack secret key is configured yet." });
      const res = await fetch("https://api.paystack.co/transaction/totals", {
        headers: { Authorization: `Bearer ${key}` },
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.status) {
        return json({ tested: true, ok: false, message: payload?.message || `Paystack rejected the key (HTTP ${res.status}).` });
      }
      return json({ tested: true, ok: true, message: `Connected to Paystack. Key mode: ${key.startsWith("sk_live") ? "live" : "test"}.` });
    }

    const { data } = await admin
      .from("payment_settings")
      .select("public_key, secret_key, currency, live_mode, updated_at")
      .eq("provider", "paystack")
      .maybeSingle();

    return json({
      public_key: data?.public_key ?? null,
      secret_key_masked: mask(data?.secret_key ?? null),
      secret_key_set: Boolean(data?.secret_key || Deno.env.get("PAYSTACK_SECRET_KEY")),
      secret_source: data?.secret_key ? "database" : (Deno.env.get("PAYSTACK_SECRET_KEY") ? "env" : "none"),
      currency: data?.currency ?? "USD",
      live_mode: Boolean(data?.live_mode),
      updated_at: data?.updated_at ?? null,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
