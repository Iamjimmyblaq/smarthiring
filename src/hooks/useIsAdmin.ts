import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "super_admin" | "admin" | "recruiter" | "member";

export function useIsAdmin() {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setRoles([]); setLoading(false); return; }
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id);
    setRoles(((data ?? []) as { role: AppRole }[]).map((r) => r.role));
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const isSuperAdmin = roles.includes("super_admin");
  const isAdmin = isSuperAdmin || roles.includes("admin");
  return { roles, isAdmin, isSuperAdmin, loading, refresh };
}

/** Resolves whether the currently signed-in user should land on the admin console. */
export async function resolveLandingRoute(): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return "/auth";
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .in("role", ["admin", "super_admin"]);
  return data && data.length > 0 ? "/admin" : "/jobs";
}
