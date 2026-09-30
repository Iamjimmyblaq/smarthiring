REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;

DROP POLICY IF EXISTS "Anyone can view active packs" ON public.credit_packs;

CREATE POLICY "Anyone can view active packs"
ON public.credit_packs FOR SELECT
TO anon, authenticated
USING (is_active);

CREATE POLICY "Admins can view all packs"
ON public.credit_packs FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));