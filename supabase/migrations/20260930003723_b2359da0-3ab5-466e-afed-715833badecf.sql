CREATE OR REPLACE FUNCTION public.apply_credit_purchase(
  _user_id uuid, _pack_key text, _reference text, _provider text DEFAULT 'paystack')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE p public.credit_packs;
BEGIN
  IF EXISTS (SELECT 1 FROM public.credit_purchases WHERE reference = _reference AND status = 'paid') THEN
    RETURN jsonb_build_object('ok', true, 'already', true);
  END IF;
  SELECT * INTO p FROM public.credit_packs WHERE key = _pack_key AND is_active;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','pack_not_found'); END IF;

  INSERT INTO public.credit_purchases (user_id, pack_key, kind, quantity, amount, currency, provider, reference, status)
  VALUES (_user_id, p.key, p.kind, p.quantity, p.price_amount, p.currency, _provider, _reference, 'paid')
  ON CONFLICT (reference) DO UPDATE SET status = 'paid', updated_at = now();

  INSERT INTO public.user_credits (user_id, kind, balance)
  VALUES (_user_id, p.kind, p.quantity)
  ON CONFLICT (user_id, kind) DO UPDATE SET balance = public.user_credits.balance + p.quantity, updated_at = now();

  RETURN jsonb_build_object('ok', true, 'kind', p.kind, 'quantity', p.quantity);
END; $fn$;
REVOKE EXECUTE ON FUNCTION public.apply_credit_purchase(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_credit_purchase(uuid, text, text, text) TO service_role;