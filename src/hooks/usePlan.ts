import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const FREE_JOB_LIMIT = 1;
export const FREE_RESUME_LIMIT = 100;

export type Plan = "free" | "pro";

export interface PlanState {
  plan: Plan;
  loading: boolean;
  jobCount: number;
  resumeCount: number;
  refresh: () => Promise<void>;
  canCreateJob: boolean;
  canUploadMore: (n?: number) => boolean;
  remainingResumes: number;
}

export function usePlan(): PlanState {
  const [plan, setPlan] = useState<Plan>("free");
  const [jobCount, setJobCount] = useState(0);
  const [resumeCount, setResumeCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setLoading(false); return; }
    const uid = userData.user.id;
    const [{ data: planRow }, { count: jc }, { count: rc }] = await Promise.all([
      supabase.from("user_plans").select("plan").eq("user_id", uid).maybeSingle(),
      supabase.from("jobs").select("*", { count: "exact", head: true }).eq("user_id", uid),
      supabase.from("candidates").select("*", { count: "exact", head: true }).eq("user_id", uid),
    ]);
    setPlan(((planRow?.plan as Plan) ?? "free"));
    setJobCount(jc ?? 0);
    setResumeCount(rc ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const isPro = plan === "pro";
  const canCreateJob = isPro || jobCount < FREE_JOB_LIMIT;
  const remainingResumes = isPro ? Number.POSITIVE_INFINITY : Math.max(0, FREE_RESUME_LIMIT - resumeCount);
  const canUploadMore = (n = 1) => isPro || resumeCount + n <= FREE_RESUME_LIMIT;

  return { plan, loading, jobCount, resumeCount, refresh, canCreateJob, canUploadMore, remainingResumes };
}