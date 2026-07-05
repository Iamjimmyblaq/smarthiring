import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    let token = url.searchParams.get("token");
    if (!token && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      token = body?.token ?? null;
    }
    if (!token || typeof token !== "string" || token.length < 8 || token.length > 128) {
      return json({ error: "Invalid token" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: session, error } = await admin
      .from("interview_sessions")
      .select("id, status, expires_at, candidate_id, job_id")
      .eq("token", token)
      .maybeSingle();
    if (error) return json({ error: "Lookup failed" }, 500);
    if (!session) return json({ error: "Session not found" }, 404);
    if (new Date(session.expires_at).getTime() <= Date.now()) {
      return json({ error: "Session expired" }, 410);
    }

    const [{ data: candidate }, { data: job }] = await Promise.all([
      admin.from("candidates").select("name").eq("id", session.candidate_id).maybeSingle(),
      admin.from("jobs").select("title, description, required_skills, company_name").eq("id", session.job_id).maybeSingle(),
    ]);

    return json({
      id: session.id,
      status: session.status,
      expires_at: session.expires_at,
      candidate_name: candidate?.name ?? "Candidate",
      job_title: job?.title ?? "",
      job_description: job?.description ?? "",
      required_skills: job?.required_skills ?? [],
      company_name: job?.company_name ?? null,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});