ALTER TABLE public.coupon_redemptions
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS original_amount numeric,
  ADD COLUMN IF NOT EXISTS final_amount numeric,
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS confirmed_via text NOT NULL DEFAULT 'verify';

CREATE UNIQUE INDEX IF NOT EXISTS coupon_redemptions_reference_key
  ON public.coupon_redemptions (payment_reference)
  WHERE payment_reference IS NOT NULL;