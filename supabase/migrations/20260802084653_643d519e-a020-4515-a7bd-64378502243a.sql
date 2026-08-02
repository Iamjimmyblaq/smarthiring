REVOKE ALL ON FUNCTION public.grant_super_admin_for_known_email() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;