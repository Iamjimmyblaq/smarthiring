// deno-lint-ignore-file no-explicit-any
/**
 * Provision a paid subscription tier and write the coupon audit record.
 * Safe to call more than once for the same payment reference — the unique
 * index on coupon_redemptions.payment_reference makes redemptions single-shot.
 */
export interface ProvisionInput {
  userId: string;
  tierKey: string;
  reference: string;
  customerCode?: string | null;
  currency?: string | null;
  amountPaidMajor?: number | null;
  metadata?: Record<string, any>;
  confirmedVia: "webhook" | "verify";
}

export async function provisionPaidPlan(admin: any, input: ProvisionInput) {
  const { data: tier } = await admin
    .from("plan_tiers")
    .select("key, name, billing_period, price_amount, currency")
    .eq("key", input.tierKey)
    .maybeSingle();

  const periodEnd = new Date();
  if ((tier?.billing_period || "month").startsWith("year")) periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  else periodEnd.setMonth(periodEnd.getMonth() + 1);

  const { error: upErr } = await admin.from("user_plans").upsert(
    {
      user_id: input.userId,
      plan: tier?.key || input.tierKey,
      current_period_end: periodEnd.toISOString(),
      stripe_customer_id: input.customerCode ?? null,
      stripe_subscription_id: input.reference,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (upErr) throw new Error(upErr.message);

  const meta = input.metadata ?? {};
  if (meta.coupon_id) {
    const discount = Number(meta.discount) || 0;
    const final = input.amountPaidMajor ?? Math.max(0, Number(tier?.price_amount ?? 0) - discount);
    const { error: insErr } = await admin.from("coupon_redemptions").insert({
      coupon_id: meta.coupon_id,
      user_id: input.userId,
      tier_key: input.tierKey,
      code: meta.coupon_code ?? null,
      amount_discounted: discount,
      original_amount: Number(tier?.price_amount ?? 0) || null,
      final_amount: final,
      currency: input.currency || tier?.currency || "USD",
      payment_reference: input.reference,
      confirmed_via: input.confirmedVia,
    });
    // 23505 = duplicate reference, i.e. already audited. Anything else is logged.
    if (insErr && insErr.code !== "23505") {
      console.error("coupon audit insert failed", insErr);
    } else if (!insErr) {
      const { data: c } = await admin.from("coupons").select("redemption_count").eq("id", meta.coupon_id).maybeSingle();
      await admin.from("coupons").update({ redemption_count: (c?.redemption_count ?? 0) + 1 }).eq("id", meta.coupon_id);
    }
  }

  return { plan: tier?.key || input.tierKey, plan_name: tier?.name || input.tierKey };
}
