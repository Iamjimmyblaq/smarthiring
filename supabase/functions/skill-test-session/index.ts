import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getOrCreateQuestions } from "../_shared/skill-questions.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { token, start } = await req.json();
    if (!token) return json({ error: "token required" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: a } = await admin
      .from("skill_test_assignments")
      .select("id, status, started_at, expires_at, test_id, candidate_id")
      .eq("token", token)
      .maybeSingle();
    if (!a) return json({ error: "This assessment link is not valid." }, 404);
    if (a.status === "submitted" || a.status === "expired") return json({ error: "This assessment has already been completed." }, 410);
    if (new Date(a.expires_at).getTime() < Date.now()) return json({ error: "This assessment link has expired." }, 410);

    const { data: test } = await admin.from("skill_tests").select("*").eq("id", a.test_id).maybeSingle();
    if (!test) return json({ error: "Assessment not found." }, 404);
    const { data: candidate } = await admin.from("candidates").select("name").eq("id", a.candidate_id).maybeSingle();

    const questions = await getOrCreateQuestions(admin, test);

    if (start && a.status === "pending") {
      await admin.from("skill_test_assignments")
        .update({ status: "in_progress", started_at: new Date().toISOString() })
        .eq("id", a.id);
    }

    return json({
      candidate_name: candidate?.name ?? "Candidate",
      status: start ? "in_progress" : a.status,
      started_at: a.started_at,
      test: {
        title: test.title,
        category: test.category,
        skill_area: test.skill_area,
        description: test.description,
        difficulty: test.difficulty,
        duration_minutes: test.duration_minutes,
        proctored: test.proctored,
      },
      // Correct answers are never sent to the browser.
      questions: questions.map((q) => ({ id: q.id, prompt: q.prompt, options: q.options })),
    });
  } catch (e) {
    console.error("skill-test-session error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
