// deno-lint-ignore-file no-explicit-any
/**
 * Question bank loader. Questions are authored once per test by the AI gateway
 * and then cached in skill_test_questions, so every candidate taking the same
 * test answers the same validated set.
 */
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

export interface BankQuestion {
  id: string;
  position: number;
  prompt: string;
  question_type: string;
  options: string[];
  correct_option: number | null;
  explanation: string | null;
  points: number;
}

export async function getOrCreateQuestions(admin: any, test: any): Promise<BankQuestion[]> {
  const { data: existing } = await admin
    .from("skill_test_questions")
    .select("*")
    .eq("test_id", test.id)
    .order("position");
  if (existing && existing.length) return existing as BankQuestion[];

  if (!LOVABLE_API_KEY) throw new Error("Question generation is unavailable right now.");

  const count = Math.max(5, Math.min(20, test.question_count ?? 12));
  const styleByCategory: Record<string, string> = {
    coding: "practical code-reading, debugging, complexity and best-practice questions with realistic snippets",
    language: "grammar, vocabulary, reading comprehension and workplace communication questions at the stated level",
    cognitive: "timed aptitude items (numerical, logical, verbal or abstract) with a single defensible answer",
    situational: "workplace scenarios with four plausible responses where one is clearly the strongest judgement",
    role_specific: "day-to-day competency questions about tools, process and judgement for this exact role",
  };

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are a psychometrician writing validated pre-hire assessments. Always call the write_test tool. Every question must have exactly 4 options and exactly one correct answer. No trick questions, no ambiguity, no duplicated items." },
        { role: "user", content: `Write ${count} ${test.difficulty} multiple-choice questions for the assessment "${test.title}".\nCategory: ${test.category}\nSkill area: ${test.skill_area}\nStyle: ${styleByCategory[test.category] ?? "role-relevant competency questions"}\nEach question needs a one-sentence explanation of why the correct option is right.` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "write_test",
          description: "Return the generated question set.",
          parameters: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    prompt: { type: "string" },
                    options: { type: "array", items: { type: "string" } },
                    correct_index: { type: "number" },
                    explanation: { type: "string" },
                  },
                  required: ["prompt", "options", "correct_index", "explanation"],
                  additionalProperties: false,
                },
              },
            },
            required: ["questions"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "write_test" } },
    }),
  });

  if (!res.ok) {
    console.error("question generation failed", res.status, await res.text());
    throw new Error(res.status === 429 ? "Assessment service is busy, please retry in a moment." : "Could not prepare this assessment.");
  }
  const data = await res.json();
  const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  const parsed = args ? JSON.parse(args) : null;
  const questions = (parsed?.questions ?? []).filter((q: any) => Array.isArray(q.options) && q.options.length === 4);
  if (!questions.length) throw new Error("Could not prepare this assessment.");

  const rows = questions.map((q: any, i: number) => ({
    test_id: test.id,
    position: i,
    prompt: String(q.prompt),
    question_type: "multiple_choice",
    options: q.options.map((o: any) => String(o)),
    correct_option: Number(q.correct_index) || 0,
    explanation: q.explanation ? String(q.explanation) : null,
    points: 1,
  }));

  const { data: inserted, error } = await admin.from("skill_test_questions").insert(rows).select("*");
  if (error) {
    // Another concurrent request may have written the bank first.
    const { data: retry } = await admin.from("skill_test_questions").select("*").eq("test_id", test.id).order("position");
    if (retry?.length) return retry as BankQuestion[];
    throw new Error(error.message);
  }
  return (inserted as BankQuestion[]).sort((a, b) => a.position - b.position);
}
