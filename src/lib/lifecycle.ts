export const STAGES = [
  { key: "sourced", label: "Sourced", color: "bg-slate-500/15 text-slate-300 border-slate-500/30" },
  { key: "screening", label: "Screening", color: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  { key: "interview", label: "Interview", color: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
  { key: "offer", label: "Offer", color: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  { key: "hired", label: "Hired", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
] as const;

export type StageKey = typeof STAGES[number]["key"];

export const STAGE_LABEL: Record<string, string> = Object.fromEntries(
  STAGES.map((s) => [s.key, s.label])
);

export const DEFAULT_ONBOARDING_TASKS = [
  "Send welcome email & contract",
  "Provision laptop & accounts",
  "Schedule first-day orientation",
  "Assign onboarding buddy",
  "Setup payroll & benefits",
  "First-week check-in",
  "30-day review",
];