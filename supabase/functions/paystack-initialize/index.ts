import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getPaystackConfig } from "../_shared/paystack.ts";
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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const user = userData.user;

    // deno-lint-ignore no-explicit-any
    const body = await req.json().catch(() => ({} as any));
    const callback_url = body?.callback_url;
    const tierKey: string = body?.tier_key || "pro";
    const couponCode: string = (body?.coupon_code || "").trim();

    const config = await getPaystackConfig();
    if (!config.secretKey) return json({ error: "Payments are not configured yet. Ask an admin to add a Paystack secret key." }, 500);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tier } = await admin
      .from("plan_tiers")
      .select("key, name, price_amount, currency")
      .eq("key", tierKey)
      .eq("is_active", true)
      .maybeSingle();

    // Fall back to the legacy fixed Pro price if the tier table is unavailable.
    const currency: string = (tier?.currency as string) || (body?.currency as string) || config.currency || "USD";
    let price = tier ? Number(tier.price_amount) : Number(body?.amount ? Number(body.amount) / 100 : 29);
    if (!Number.isFinite(price) || price < 0) price = 0;

    let couponId: string | null = null;
    let discount = 0;
    if (couponCode) {
      const result = await validateCoupon(admin, couponCode, tierKey, price, user.id);
      if (!result.ok) return json({ error: result.reason || "Coupon could not be applied." }, 400);
      couponId = result.coupon!.id;
      discount = result.discount ?? 0;
      price = result.total ?? price;
    }

    if (price <= 0) {
      // Fully discounted — provision the plan immediately, no checkout needed.
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      await admin.from("user_plans").upsert(
        { user_id: user.id, plan: tierKey, current_period_end: periodEnd.toISOString(), updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
      if (couponId) {
        await admin.from("coupon_redemptions").insert({
          coupon_id: couponId, user_id: user.id, tier_key: tierKey, amount_discounted: discount,
        });
        await admin.rpc.bind?.(null);
        const { data: c } = await admin.from("coupons").select("redemption_count").eq("id", couponId).maybeSingle();
        await admin.from("coupons").update({ redemption_count: (c?.redemption_count ?? 0) + 1 }).eq("id", couponId);
      }
      return json({ free: true, plan: tierKey, discount });
    }

    const amountMinor = Math.round(price * 100);

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: amountMinor,
        currency,
        callback_url,
        channels: ["card", "bank", "apple_pay", "ussd", "qr", "mobile_money", "bank_transfer"],
        metadata: {
          user_id: user.id,
          plan: tierKey,
          tier_key: tierKey,
          coupon_id: couponId,
          coupon_code: couponId ? couponCode.toUpperCase() : null,
          discount,
        },
      }),
    });
    const data = await res.json();
    if (!data.status) return json({ error: data.message || "Init failed" }, 400);

    return json({
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
      amount: price,
      currency,
      discount,
      plan: tierKey,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
