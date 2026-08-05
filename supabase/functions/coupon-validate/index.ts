import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { validateCoupon } from "../_shared/coupons.ts";

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

    const { code, tier_key } = await req.json().catch(() => ({}));
    if (!tier_key) return json({ error: "tier_key required" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tier } = await admin
      .from("plan_tiers")
      .select("key, name, price_amount, currency")
      .eq("key", tier_key)
      .eq("is_active", true)
      .maybeSingle();
    if (!tier) return json({ error: "Plan not found" }, 404);

    const price = Number(tier.price_amount) || 0;
    const result = await validateCoupon(admin, code, tier_key, price, userData.user.id);
    if (!result.ok) return json({ valid: false, reason: result.reason, price, currency: tier.currency });

    return json({
      valid: true,
      code: result.coupon!.code,
      discount_type: result.coupon!.discount_type,
      discount_value: Number(result.coupon!.discount_value),
      discount: result.discount,
      price,
      total: result.total,
      currency: tier.currency,
      tier_name: tier.name,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
