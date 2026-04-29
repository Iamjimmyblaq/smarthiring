import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Body {
  candidate_id: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const { candidate_id } = (await req.json()) as Body;
    if (!candidate_id || typeof candidate_id !== "string") {
      return json({ error: "candidate_id required" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: candidate, error: cErr } = await admin
      .from("candidates")
      .select("id, user_id, job_id, resume_text, name, email")
      .eq("id", candidate_id)
      .maybeSingle();
    if (cErr || !candidate) return json({ error: "Candidate not found" }, 404);
    if (candidate.user_id !== userId) return json({ error: "Forbidden" }, 403);

    const { data: job, error: jErr } = await admin
      .from("jobs")
      .select("id, title, description, requirements, required_skills, min_years_experience")
      .eq("id", candidate.job_id)
      .maybeSingle();
    if (jErr || !job) return json({ error: "Job not found" }, 404);

    await admin.from("candidates").update({ processing_status: "processing", error_message: null }).eq("id", candidate_id);

    const resumeText = (candidate.resume_text ?? "").slice(0, 20000);
    if (!resumeText.trim()) {
      await admin.from("candidates").update({
        processing_status: "error",
        error_message: "Empty resume text",
      }).eq("id", candidate_id);
      return json({ error: "Empty resume text" }, 400);
    }

    const requiredSkills: string[] = (job as { required_skills?: string[] }).required_skills ?? [];
    const minYears: number = (job as { min_years_experience?: number }).min_years_experience ?? 0;

    const systemPrompt = `You are an expert technical recruiter. Score a candidate's resume against a job. Be strict, fair, and concise. Always return your evaluation ONLY via the score_candidate tool. When evaluating skills, match each REQUIRED SKILL against the resume — count a skill as matched only if there's clear evidence (mentioned in projects, work experience, or skills section). Estimate total years of professional experience from the resume. Also rate the resume quality (formatting, completeness, clarity, contact info, structure).`;
    const userPrompt = `JOB TITLE: ${job.title}

JOB DESCRIPTION:
${job.description}

KEY REQUIREMENTS (free text):
${job.requirements}

REQUIRED SKILLS (structured, evaluate each):
${requiredSkills.length ? requiredSkills.map((s) => `- ${s}`).join("\n") : "(none specified — infer from requirements)"}

MINIMUM YEARS OF EXPERIENCE REQUIRED: ${minYears}

RESUME:
${resumeText}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "score_candidate",
            description: "Return a structured candidate evaluation.",
            parameters: {
              type: "object",
              properties: {
                candidate_name: { type: "string", description: "Best guess of candidate full name from resume" },
                candidate_email: { type: "string", description: "Email if present, else empty string" },
                overall_score: { type: "integer", minimum: 0, maximum: 100 },
                skills_score: { type: "integer", minimum: 0, maximum: 100 },
                experience_score: { type: "integer", minimum: 0, maximum: 100 },
                education_score: { type: "integer", minimum: 0, maximum: 100 },
                matched_skills: { type: "array", items: { type: "string" }, description: "Subset of REQUIRED SKILLS the candidate clearly demonstrates. Use the exact skill name as provided." },
                missing_skills: { type: "array", items: { type: "string" }, description: "Subset of REQUIRED SKILLS not evidenced in the resume. Use the exact skill name as provided." },
                years_experience: { type: "number", description: "Estimated total years of professional experience (decimal allowed, e.g. 4.5). 0 if none." },
                resume_quality_score: { type: "integer", minimum: 0, maximum: 100, description: "Overall quality of the resume itself: completeness, formatting, clarity, presence of contact info, dates, achievements." },
                resume_quality_issues: { type: "array", items: { type: "string" }, description: "0-4 short concrete issues with the resume (e.g. 'No contact info', 'Missing dates', 'Very short'). Empty array if resume is solid." },
                strengths: { type: "array", items: { type: "string" }, description: "3-5 short strengths" },
                gaps: { type: "array", items: { type: "string" }, description: "2-4 short gaps vs requirements" },
                summary: { type: "string", description: "2-3 sentence rationale" },
              },
              required: ["overall_score", "skills_score", "experience_score", "education_score", "strengths", "gaps", "summary", "candidate_name", "candidate_email", "matched_skills", "missing_skills", "years_experience", "resume_quality_score", "resume_quality_issues"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "score_candidate" } },
      }),
    });

    if (!aiResp.ok) {
      const text = await aiResp.text();
      console.error("AI error", aiResp.status, text);
      const msg = aiResp.status === 429
        ? "Rate limit hit. Try again shortly."
        : aiResp.status === 402
        ? "AI credits exhausted. Add funds in Settings → Workspace → Usage."
        : "AI scoring failed";
      await admin.from("candidates").update({ processing_status: "error", error_message: msg }).eq("id", candidate_id);
      return json({ error: msg }, aiResp.status);
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      await admin.from("candidates").update({ processing_status: "error", error_message: "No tool call returned" }).eq("id", candidate_id);
      return json({ error: "No structured output" }, 500);
    }
    const args = JSON.parse(toolCall.function.arguments);

    const update = {
      name: candidate.name || args.candidate_name || null,
      email: candidate.email || args.candidate_email || null,
      overall_score: args.overall_score,
      skills_score: args.skills_score,
      experience_score: args.experience_score,
      education_score: args.education_score,
      matched_skills: args.matched_skills ?? [],
      missing_skills: args.missing_skills ?? [],
      years_experience: args.years_experience ?? null,
      resume_quality_score: args.resume_quality_score ?? null,
      resume_quality_issues: args.resume_quality_issues ?? [],
      strengths: args.strengths ?? [],
      gaps: args.gaps ?? [],
      summary: args.summary ?? "",
      processing_status: "done",
      error_message: null,
    };
    const { error: upErr } = await admin.from("candidates").update(update).eq("id", candidate_id);
    if (upErr) {
      console.error(upErr);
      return json({ error: upErr.message }, 500);
    }

    return json({ ok: true, ...update });
  } catch (e) {
    console.error("score-candidate error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}