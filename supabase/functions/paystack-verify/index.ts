import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getPaystackConfig } from "../_shared/paystack.ts";

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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const user = userData.user;

    const { reference } = await req.json();
    if (!reference) return json({ error: "Missing reference" }, 400);

    const config = await getPaystackConfig();
    if (!config.secretKey) return json({ error: "Payments are not configured yet." }, 500);

    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${config.secretKey}` },
    });
    const data = await res.json();
    if (!data.status || data.data?.status !== "success") {
      console.error("Paystack verify failed", { reference, response: data });
      return json({ error: "Payment could not be verified. Please contact support." }, 400);
    }

    const meta = data.data?.metadata ?? {};
    const metaUserId = meta.user_id;
    if (!metaUserId || metaUserId !== user.id) {
      console.error("Paystack metadata user mismatch", { reference, metaUserId, userId: user.id });
      return json({ error: "Forbidden" }, 403);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolve the tier the customer actually paid for.
    const tierKey: string = meta.tier_key || meta.plan || "pro";
    const { data: tier } = await admin
      .from("plan_tiers")
      .select("key, name, billing_period")
      .eq("key", tierKey)
      .maybeSingle();

    const periodEnd = new Date();
    if ((tier?.billing_period || "month").startsWith("year")) periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    else periodEnd.setMonth(periodEnd.getMonth() + 1);

    const { error: upErr } = await admin
      .from("user_plans")
      .upsert(
        {
          user_id: user.id,
          plan: tier?.key || tierKey,
          current_period_end: periodEnd.toISOString(),
          stripe_customer_id: data.data?.customer?.customer_code ?? null,
          stripe_subscription_id: reference,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    if (upErr) return json({ error: upErr.message }, 500);

    // Record the coupon redemption once per successful reference.
    if (meta.coupon_id) {
      const { data: existing } = await admin
        .from("coupon_redemptions")
        .select("id")
        .eq("coupon_id", meta.coupon_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!existing) {
        await admin.from("coupon_redemptions").insert({
          coupon_id: meta.coupon_id,
          user_id: user.id,
          tier_key: tierKey,
          amount_discounted: Number(meta.discount) || 0,
        });
        const { data: c } = await admin.from("coupons").select("redemption_count").eq("id", meta.coupon_id).maybeSingle();
        await admin.from("coupons").update({ redemption_count: (c?.redemption_count ?? 0) + 1 }).eq("id", meta.coupon_id);
      }
    }

    return json({ success: true, plan: tier?.key || tierKey, plan_name: tier?.name || tierKey });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
