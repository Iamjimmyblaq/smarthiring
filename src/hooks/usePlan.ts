import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Fallback limits used only when no tier row can be resolved. */
export const FREE_JOB_LIMIT = 1;
export const FREE_RESUME_LIMIT = 100;
export const FREE_ASSESSMENT_LIMIT = 20;

export type Plan = string;

export interface PlanLimits {
  /** null means unlimited. */
  jobs: number | null;
  resumes: number | null;
  assessments: number | null;
  aiInterviews: number | null;
}

export interface PlanState {
  plan: Plan;
  tierName: string;
  loading: boolean;
  jobCount: number;
  resumeCount: number;
  assessmentCount: number;
  aiInterviewCount: number;
  limits: PlanLimits;
  refresh: () => Promise<void>;
  canCreateJob: boolean;
  canUploadMore: (n?: number) => boolean;
  canSendAssessment: boolean;
  remainingResumes: number;
  remainingAssessments: number;
  remainingAiInterviews: number;
}

const remaining = (limit: number | null, used: number) =>
  limit === null ? Number.POSITIVE_INFINITY : Math.max(0, limit - used);

export function usePlan(): PlanState {
  const [plan, setPlan] = useState<Plan>("free");
  const [tierName, setTierName] = useState("Free");
  const [jobCount, setJobCount] = useState(0);
  const [resumeCount, setResumeCount] = useState(0);
  const [assessmentCount, setAssessmentCount] = useState(0);
  const [aiInterviewCount, setAiInterviewCount] = useState(0);
  const [limits, setLimits] = useState<PlanLimits>({
    jobs: FREE_JOB_LIMIT,
    resumes: FREE_RESUME_LIMIT,
    assessments: FREE_ASSESSMENT_LIMIT,
    aiInterviews: null,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setLoading(false); return; }
    const uid = userData.user.id;
    const [{ data: planRow }, { count: jc }, { count: rc }, { count: ac }, { count: ic }, { data: tiers }] =
      await Promise.all([
        supabase.from("user_plans").select("plan").eq("user_id", uid).maybeSingle(),
        supabase.from("jobs").select("*", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("candidates").select("*", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("skill_test_assignments").select("*", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("interview_sessions").select("*", { count: "exact", head: true }).eq("user_id", uid),
        supabase
          .from("plan_tiers")
          .select("key, name, price_amount, max_jobs, max_resumes, max_assessments, max_ai_interviews")
          .eq("is_active", true)
          .order("sort_order"),
      ]);

    const key = (planRow?.plan as string) ?? "free";
    const rows = tiers ?? [];
    const tier = rows.find((t) => t.key === key) ?? rows.find((t) => Number(t.price_amount) === 0) ?? null;

    setPlan(key);
    setTierName(tier?.name ?? "Free");
    setJobCount(jc ?? 0);
    setResumeCount(rc ?? 0);
    setAssessmentCount(ac ?? 0);
    setAiInterviewCount(ic ?? 0);
    setLimits(
      tier
        ? {
            jobs: tier.max_jobs ?? null,
            resumes: tier.max_resumes ?? null,
            assessments: tier.max_assessments ?? null,
            aiInterviews: tier.max_ai_interviews ?? null,
          }
        : { jobs: FREE_JOB_LIMIT, resumes: FREE_RESUME_LIMIT, assessments: FREE_ASSESSMENT_LIMIT, aiInterviews: null },
    );
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const canCreateJob = limits.jobs === null || jobCount < limits.jobs;
  const canUploadMore = (n = 1) => limits.resumes === null || resumeCount + n <= limits.resumes;
  const canSendAssessment = limits.assessments === null || assessmentCount < limits.assessments;

  return {
    plan,
    tierName,
    loading,
    jobCount,
    resumeCount,
    assessmentCount,
    aiInterviewCount,
    limits,
    refresh,
    canCreateJob,
    canUploadMore,
    canSendAssessment,
    remainingResumes: remaining(limits.resumes, resumeCount),
    remainingAssessments: remaining(limits.assessments, assessmentCount),
    remainingAiInterviews: remaining(limits.aiInterviews, aiInterviewCount),
  };
}
