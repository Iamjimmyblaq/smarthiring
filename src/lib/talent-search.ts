/**
 * Lightweight natural-language search over the recruiter's own candidate pool.
 * Runs entirely on already-loaded rows so results are instant and never leave
 * the recruiter's account.
 */

export interface SearchableCandidate {
  id: string;
  name: string | null;
  email: string | null;
  stage: string;
  overall_score: number | null;
  skills_score: number | null;
  experience_score: number | null;
  years_experience: number | null;
  matched_skills: string[];
  missing_skills: string[];
  strengths: string[] | null;
  summary: string | null;
  resume_text: string | null;
  created_at: string;
  job_id: string;
  jobs?: { title: string } | null;
}

export interface Criteria {
  minScore?: number;
  maxScore?: number;
  minYears?: number;
  stage?: string;
  terms: string[];
  raw: string;
}

const STOP = new Set([
  "show", "me", "find", "all", "the", "a", "an", "with", "who", "and", "or", "of", "in", "on",
  "for", "candidates", "candidate", "people", "person", "that", "have", "has", "had", "are",
  "is", "was", "were", "over", "under", "above", "below", "more", "than", "at", "least", "years",
  "year", "experience", "scored", "score", "scoring", "from", "any", "list", "give", "get",
  "top", "please", "us", "our", "their", "his", "her", "they", "to", "by", "only",
]);

const STAGE_WORDS: Record<string, string> = {
  sourced: "sourced", screening: "screening", interview: "interview",
  interviewing: "interview", offer: "offer", hired: "hired", rejected: "rejected",
};

/** Turns plain English into concrete filters plus free-text keywords. */
export function parseQuery(q: string): Criteria {
  const lower = q.toLowerCase();
  const c: Criteria = { terms: [], raw: q };

  const pct = lower.match(/(?:over|above|more than|at least|>=?|\bmin(?:imum)?\b)\s*(\d{1,3})\s*%?/);
  if (pct?.[1]) c.minScore = Math.min(100, Number(pct[1]));
  const under = lower.match(/(?:under|below|less than|<=?)\s*(\d{1,3})\s*%?/);
  if (under?.[1]) c.maxScore = Math.min(100, Number(under[1]));

  const yrs = lower.match(/(\d{1,2})\s*\+?\s*(?:years?|yrs?)/);
  if (yrs?.[1]) c.minYears = Number(yrs[1]);

  for (const [word, stage] of Object.entries(STAGE_WORDS)) {
    if (new RegExp(`\\b${word}\\b`).test(lower)) { c.stage = stage; break; }
  }

  c.terms = lower
    .replace(/[^a-z0-9+#.\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t) && !/^\d+$/.test(t));

  return c;
}

export interface SearchHit {
  candidate: SearchableCandidate;
  score: number;
  reasons: string[];
}

/** Ranks candidates against the parsed criteria and explains every match. */
export function searchCandidates(rows: SearchableCandidate[], query: string): SearchHit[] {
  const c = parseQuery(query);
  const hits: SearchHit[] = [];

  for (const r of rows) {
    const reasons: string[] = [];
    let score = 0;

    if (c.minScore != null) {
      if ((r.overall_score ?? -1) < c.minScore) continue;
      reasons.push(`Scored ${r.overall_score}, above ${c.minScore}`);
      score += 25;
    }
    if (c.maxScore != null) {
      if ((r.overall_score ?? 101) > c.maxScore) continue;
      reasons.push(`Scored ${r.overall_score}, below ${c.maxScore}`);
      score += 10;
    }
    if (c.minYears != null) {
      if ((r.years_experience ?? -1) < c.minYears) continue;
      reasons.push(`${r.years_experience} years of experience`);
      score += 20;
    }
    if (c.stage) {
      if (r.stage !== c.stage) continue;
      reasons.push(`Currently at ${c.stage} stage`);
      score += 10;
    }

    const haystackParts = [
      r.name ?? "",
      r.jobs?.title ?? "",
      r.summary ?? "",
      (r.matched_skills ?? []).join(" "),
      (r.strengths ?? []).join(" "),
      (r.resume_text ?? "").slice(0, 8000),
    ];
    const haystack = haystackParts.join(" ").toLowerCase();

    const matchedTerms: string[] = [];
    for (const t of c.terms) {
      if (haystack.includes(t)) {
        matchedTerms.push(t);
        score += (r.matched_skills ?? []).some((s) => s.toLowerCase().includes(t)) ? 14 : 8;
      }
    }
    if (c.terms.length > 0 && matchedTerms.length === 0) continue;
    if (matchedTerms.length) reasons.push(`Matches: ${matchedTerms.join(", ")}`);

    score += (r.overall_score ?? 0) / 10;
    hits.push({ candidate: r, score, reasons });
  }

  return hits.sort((a, b) => b.score - a.score);
}

export const SEARCH_EXAMPLES = [
  "Mud engineers with 4+ years experience who scored over 70",
  "Candidates at interview stage with HSE compliance",
  "Anyone scoring under 40 for the senior role",
  "Python and SQL candidates scored above 80",
];
