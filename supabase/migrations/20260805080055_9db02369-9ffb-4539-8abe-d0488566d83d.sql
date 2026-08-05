DROP POLICY IF EXISTS "public can read live coupons" ON public.coupons;

CREATE POLICY "public can read promoted coupons"
ON public.coupons
FOR SELECT
TO anon, authenticated
USING (
  is_active
  AND show_on_home
  AND (valid_from IS NULL OR valid_from <= now())
  AND (valid_until IS NULL OR valid_until > now())
);

GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
GRANT SELECT ON public.plan_tiers TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_tiers TO authenticated;
GRANT ALL ON public.plan_tiers TO service_role;