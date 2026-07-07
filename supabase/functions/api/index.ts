import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") || "https://smarthiring.lovable.app";

async function sha256Hex(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

async function authenticate(req: Request, admin: ReturnType<typeof createClient>) {
  const key = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!key || !key.startsWith("sh_")) return null;
  const hash = await sha256Hex(key);
  const { data } = await admin.from("api_keys").select("id, user_id, revoked_at").eq("key_hash", hash).maybeSingle();
  if (!data || data.revoked_at) return null;
  admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id).then(() => {});
  return { userId: data.user_id as string, keyId: data.id as string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const auth = await authenticate(req, admin);
  if (!auth) return json({ error: "Invalid or missing API key" }, 401);

  // Strip prefix: /functions/v1/api/... or /api/...
  const path = url.pathname.replace(/^.*\/api/, "");
  const seg = path.split("/").filter(Boolean); // ["v1","jobs",...]
  if (seg[0] !== "v1") return json({ error: "Unknown version" }, 404);
  const resource = seg[1];
  const id = seg[2];
  const sub = seg[3];

  try {
    // ================= JOBS =================
    if (resource === "jobs") {
      if (req.method === "GET" && !id) {
        const limit = Math.min(Number(url.searchParams.get("limit") || 50), 100);
        const { data, error } = await admin.from("jobs").select("*").eq("user_id", auth.userId).order("created_at", { ascending: false }).limit(limit);
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }
      if (req.method === "GET" && id) {
        const { data, error } = await admin.from("jobs").select("*").eq("id", id).eq("user_id", auth.userId).maybeSingle();
        if (error || !data) return json({ error: "Not found" }, 404);
        return json({ data });
      }
      if (req.method === "POST" && !id) {
        const body = await req.json();
        const { data, error } = await admin.from("jobs").insert({ ...body, user_id: auth.userId }).select().single();
        if (error) return json({ error: error.message }, 400);
        return json({ data }, 201);
      }
      if (req.method === "PATCH" && id) {
        const body = await req.json();
        const { data, error } = await admin.from("jobs").update(body).eq("id", id).eq("user_id", auth.userId).select().single();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }
      if (req.method === "DELETE" && id) {
        const { error } = await admin.from("jobs").delete().eq("id", id).eq("user_id", auth.userId);
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true });
      }
    }

    // ================= CANDIDATES =================
    if (resource === "candidates") {
      if (req.method === "GET" && !id) {
        const jobId = url.searchParams.get("job_id");
        let q = admin.from("candidates").select("*").eq("user_id", auth.userId).order("created_at", { ascending: false }).limit(100);
        if (jobId) q = q.eq("job_id", jobId);
        const { data, error } = await q;
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }
      if (req.method === "GET" && id) {
        const { data, error } = await admin.from("candidates").select("*").eq("id", id).eq("user_id", auth.userId).maybeSingle();
        if (error || !data) return json({ error: "Not found" }, 404);
        return json({ data });
      }
      if (req.method === "POST" && !id) {
        const body = await req.json();
        if (!body.job_id) return json({ error: "job_id required" }, 400);
        const { data, error } = await admin.from("candidates").insert({
          user_id: auth.userId,
          job_id: body.job_id,
          name: body.name,
          email: body.email,
          phone: body.phone,
          resume_url: body.resume_url,
          stage: body.stage || "sourced",
          source: body.source || "api",
        }).select().single();
        if (error) return json({ error: error.message }, 400);
        return json({ data }, 201);
      }
      if (req.method === "PATCH" && id) {
        const body = await req.json();
        const { data, error } = await admin.from("candidates").update(body).eq("id", id).eq("user_id", auth.userId).select().single();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }
    }

    // ================= INTERVIEWS =================
    if (resource === "interviews" && !sub) {
      if (req.method === "POST" && !id) {
        const body = await req.json();
        if (!body.candidate_id || !body.scheduled_at) return json({ error: "candidate_id and scheduled_at required" }, 400);
        const { data: cand } = await admin.from("candidates").select("job_id").eq("id", body.candidate_id).eq("user_id", auth.userId).maybeSingle();
        if (!cand) return json({ error: "candidate not found" }, 404);
        const { data, error } = await admin.from("interviews").insert({
          user_id: auth.userId,
          candidate_id: body.candidate_id,
          job_id: cand.job_id,
          scheduled_at: body.scheduled_at,
          duration_minutes: body.duration_minutes || 45,
          interview_type: body.interview_type || "virtual",
          interviewer: body.interviewer || null,
          meeting_link: body.meeting_link || null,
          status: "scheduled",
        }).select().single();
        if (error) return json({ error: error.message }, 400);
        return json({ data }, 201);
      }
    }

    // ================= AI INTERVIEW SESSIONS =================
    if (resource === "interviews" && id === "ai-sessions") {
      if (req.method === "POST") {
        const body = await req.json();
        if (!body.candidate_id) return json({ error: "candidate_id required" }, 400);
        const { data: cand } = await admin.from("candidates").select("job_id").eq("id", body.candidate_id).eq("user_id", auth.userId).maybeSingle();
        if (!cand) return json({ error: "candidate not found" }, 404);
        const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data, error } = await admin.from("interview_sessions").insert({
          user_id: auth.userId, candidate_id: body.candidate_id, job_id: cand.job_id,
          token, expires_at: expiresAt, status: "pending",
        }).select().single();
        if (error) return json({ error: error.message }, 400);
        return json({ data: { ...data, interview_url: `${SITE_URL}/interview/${token}` } }, 201);
      }
    }
    if (resource === "interviews" && id === "ai-sessions" && sub) {
      if (req.method === "GET") {
        const { data, error } = await admin.from("interview_sessions").select("*").eq("id", sub).eq("user_id", auth.userId).maybeSingle();
        if (error || !data) return json({ error: "Not found" }, 404);
        return json({ data: { ...data, interview_url: `${SITE_URL}/interview/${data.token}` } });
      }
    }

    // ================= WEBHOOKS =================
    if (resource === "webhooks") {
      if (req.method === "GET" && !id) {
        const { data } = await admin.from("webhook_endpoints").select("id, url, events, enabled, created_at").eq("user_id", auth.userId);
        return json({ data });
      }
      if (req.method === "POST" && !id) {
        const body = await req.json();
        if (!body.url) return json({ error: "url required" }, 400);
        const secret = "whsec_" + crypto.randomUUID().replace(/-/g, "");
        const { data, error } = await admin.from("webhook_endpoints").insert({
          user_id: auth.userId, url: body.url, secret, events: body.events || [], enabled: true,
        }).select().single();
        if (error) return json({ error: error.message }, 400);
        return json({ data }, 201);
      }
      if (req.method === "DELETE" && id) {
        const { error } = await admin.from("webhook_endpoints").delete().eq("id", id).eq("user_id", auth.userId);
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true });
      }
    }

    return json({ error: "Not found", path }, 404);
  } catch (e) {
    console.error("api error", e);
    return json({ error: String(e) }, 500);
  }
});