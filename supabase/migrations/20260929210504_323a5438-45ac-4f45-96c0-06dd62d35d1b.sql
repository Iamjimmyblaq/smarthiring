DROP POLICY IF EXISTS "role permissions readable by authenticated" ON public.role_permissions;
DROP POLICY IF EXISTS "role permissions readable" ON public.role_permissions;
REVOKE SELECT ON public.role_permissions FROM anon;
CREATE POLICY "admins read role permissions"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (private.is_admin(auth.uid()));