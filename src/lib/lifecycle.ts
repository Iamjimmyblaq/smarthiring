// Per-stage theming. Each stage has:
//  - color: badge style (chip)
//  - column: gradient/border styling for the pipeline column
//  - dot: small accent dot
//  - accent: solid accent for icons / count badges
export const STAGES = [
  {
    key: "sourced",
    label: "Sourced",
    color: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/40",
    column: "bg-gradient-to-b from-blue-500/10 to-transparent border-blue-500/30",
    dot: "bg-blue-500",
    accent: "text-blue-600 dark:text-blue-400",
  },
  {
    key: "screening",
    label: "Screening",
    color: "bg-white text-slate-900 border-slate-300 dark:bg-slate-100 dark:text-slate-900",
    column: "bg-gradient-to-b from-white to-slate-50/40 border-slate-300 dark:from-slate-100/10 dark:to-transparent",
    dot: "bg-slate-400",
    accent: "text-slate-700 dark:text-slate-200",
  },
  {
    key: "interview",
    label: "Interview",
    color: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/40",
    column: "bg-gradient-to-b from-red-500/10 to-transparent border-red-500/30",
    dot: "bg-red-500",
    accent: "text-red-600 dark:text-red-400",
  },
  {
    key: "offer",
    label: "Offer",
    color: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40",
    column: "bg-gradient-to-b from-amber-500/10 to-transparent border-amber-500/30",
    dot: "bg-amber-500",
    accent: "text-amber-600 dark:text-amber-400",
  },
  {
    key: "hired",
    label: "Hired",
    color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40",
    column: "bg-gradient-to-b from-emerald-500/15 to-transparent border-emerald-500/40",
    dot: "bg-emerald-500",
    accent: "text-emerald-600 dark:text-emerald-400",
  },
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