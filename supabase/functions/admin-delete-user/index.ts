import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const caller = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await caller.auth.getUser();
    if (!userData.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roles } = await admin
      .from("user_roles").select("role").eq("user_id", userData.user.id)
      .in("role", ["admin", "super_admin"]);
    if (!roles || roles.length === 0) return json({ error: "Admin access required" }, 403);

    const { user_id } = await req.json().catch(() => ({ user_id: null }));
    if (!user_id || typeof user_id !== "string") return json({ error: "user_id required" }, 400);
    if (user_id === userData.user.id) return json({ error: "You cannot delete your own account" }, 400);

    const { data: target } = await admin.from("user_roles").select("role").eq("user_id", user_id);
    if ((target ?? []).some((r) => r.role === "super_admin")) {
      return json({ error: "Super admin accounts cannot be deleted" }, 403);
    }

    // Remove application data, then the auth account.
    await admin.from("candidates").delete().eq("user_id", user_id);
    await admin.from("interview_sessions").delete().eq("user_id", user_id);
    await admin.from("interviews").delete().eq("user_id", user_id);
    await admin.from("offers").delete().eq("user_id", user_id);
    await admin.from("onboarding_tasks").delete().eq("user_id", user_id);
    await admin.from("jobs").delete().eq("user_id", user_id);
    await admin.from("team_members").delete().eq("user_id", user_id);
    await admin.from("user_roles").delete().eq("user_id", user_id);
    await admin.from("user_plans").delete().eq("user_id", user_id);
    await admin.from("profiles").delete().eq("id", user_id);

    const { error } = await admin.auth.admin.deleteUser(user_id);
    if (error) return json({ error: error.message }, 400);

    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});