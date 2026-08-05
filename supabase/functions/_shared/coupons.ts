// deno-lint-ignore-file no-explicit-any
export interface CouponRow {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  applies_to_tiers: string[] | null;
  max_redemptions: number | null;
  redemption_count: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
}

export interface CouponResult {
  ok: boolean;
  reason?: string;
  coupon?: CouponRow;
  discount?: number;
  total?: number;
}

/** Validate a coupon against a tier price. `price` is in major units (e.g. 49.00). */
export async function validateCoupon(
  admin: any,
  code: string,
  tierKey: string,
  price: number,
  userId: string,
): Promise<CouponResult> {
  const normalized = (code || "").trim().toUpperCase();
  if (!normalized) return { ok: false, reason: "Enter a coupon code." };

  const { data } = await admin
    .from("coupons")
    .select("id, code, discount_type, discount_value, applies_to_tiers, max_redemptions, redemption_count, valid_from, valid_until, is_active")
    .ilike("code", normalized)
    .maybeSingle();

  const coupon = data as CouponRow | null;
  if (!coupon) return { ok: false, reason: "That coupon code does not exist." };
  if (!coupon.is_active) return { ok: false, reason: "This coupon is no longer active." };

  const now = Date.now();
  if (coupon.valid_from && new Date(coupon.valid_from).getTime() > now) {
    return { ok: false, reason: "This coupon is not active yet." };
  }
  if (coupon.valid_until && new Date(coupon.valid_until).getTime() < now) {
    return { ok: false, reason: "This coupon has expired." };
  }
  if (coupon.max_redemptions !== null && coupon.redemption_count >= coupon.max_redemptions) {
    return { ok: false, reason: "This coupon has reached its redemption limit." };
  }
  const tiers = coupon.applies_to_tiers ?? [];
  if (tiers.length > 0 && !tiers.includes(tierKey)) {
    return { ok: false, reason: "This coupon does not apply to the selected plan." };
  }

  const { count } = await admin
    .from("coupon_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("coupon_id", coupon.id)
    .eq("user_id", userId);
  if ((count ?? 0) > 0) return { ok: false, reason: "You have already used this coupon." };

  const raw = coupon.discount_type === "percent"
    ? (price * Number(coupon.discount_value)) / 100
    : Number(coupon.discount_value);
  const discount = Math.max(0, Math.min(price, Math.round(raw * 100) / 100));
  const total = Math.round((price - discount) * 100) / 100;

  return { ok: true, coupon, discount, total };
}
