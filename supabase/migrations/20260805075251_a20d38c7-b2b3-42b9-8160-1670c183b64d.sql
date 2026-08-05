DROP POLICY IF EXISTS "role permissions readable" ON public.role_permissions;

CREATE POLICY "role permissions readable by authenticated"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (true);

REVOKE SELECT ON public.role_permissions FROM anon;