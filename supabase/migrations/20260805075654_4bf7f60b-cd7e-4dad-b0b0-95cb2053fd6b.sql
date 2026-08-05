CREATE TABLE public.payment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL UNIQUE,
  public_key text,
  secret_key text,
  currency text NOT NULL DEFAULT 'USD',
  live_mode boolean NOT NULL DEFAULT false,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.payment_settings TO service_role;

ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only manages payment settings"
ON public.payment_settings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE TRIGGER payment_settings_updated_at
BEFORE UPDATE ON public.payment_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.payment_settings (provider, currency) VALUES ('paystack', 'USD')
ON CONFLICT (provider) DO NOTHING;