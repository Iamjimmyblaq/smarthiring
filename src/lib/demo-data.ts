export type DemoCandidate = {
  id: string;
  name: string;
  title: string;
  location: string;
  yearsExperience: number;
  score: number;
  skills: string[];
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  gaps: string[];
  summary: string;
  email: string;
  resumeQuality: number;
};

export const DEMO_JOB = {
  title: "Senior Frontend Developer",
  company: "Acme Studio",
  location: "Remote · EU/US",
  minYears: 4,
  requiredSkills: ["React", "TypeScript", "Next.js", "Tailwind", "Testing", "Accessibility", "Performance", "GraphQL"],
  niceToHave: ["Design Systems", "Framer Motion", "Storybook"],
  description:
    "Build and ship high-impact UI for our flagship product. Own component architecture, performance budgets, and accessibility across the platform.",
};

export const DEMO_CANDIDATES: DemoCandidate[] = [
  {
    id: "c1", name: "Julian Thorne", title: "Sr. Frontend Engineer", location: "Berlin, DE",
    yearsExperience: 7, score: 96, email: "julian.thorne@example.com", resumeQuality: 94,
    skills: ["React","TypeScript","Next.js","Tailwind","Testing","Accessibility","GraphQL","Design Systems","Storybook"],
    matchedSkills: ["React","TypeScript","Next.js","Tailwind","Testing","Accessibility","GraphQL"],
    missingSkills: ["Performance"],
    strengths: ["Led design system at 200-eng org","Strong a11y track record","Open-source maintainer"],
    gaps: ["Limited Core Web Vitals optimization examples"],
    summary: "Senior IC with deep design-system + a11y expertise. Strong React/TS foundation and OSS visibility.",
  },
  {
    id: "c2", name: "Amara Okafor", title: "Frontend Lead", location: "London, UK",
    yearsExperience: 8, score: 93, email: "amara.okafor@example.com", resumeQuality: 91,
    skills: ["React","TypeScript","Next.js","Tailwind","Performance","GraphQL","Framer Motion"],
    matchedSkills: ["React","TypeScript","Next.js","Tailwind","Performance","GraphQL"],
    missingSkills: ["Testing","Accessibility"],
    strengths: ["Proven performance wins (LCP -45%)","Tech lead of 6","Mentorship"],
    gaps: ["Testing culture not detailed","A11y experience inferred"],
    summary: "Frontend lead with strong performance + delivery focus. Great fit for senior IC or lead.",
  },
  {
    id: "c3", name: "Marcus Chen", title: "Sr. React Developer", location: "Toronto, CA",
    yearsExperience: 6, score: 89, email: "marcus.chen@example.com", resumeQuality: 88,
    skills: ["React","TypeScript","Tailwind","Testing","Storybook","Design Systems"],
    matchedSkills: ["React","TypeScript","Tailwind","Testing"],
    missingSkills: ["Next.js","GraphQL","Performance","Accessibility"],
    strengths: ["Excellent code quality","Component library author"],
    gaps: ["No Next.js production experience","Limited GraphQL exposure"],
    summary: "Strong product engineer with component-library background. Some stack gaps to address.",
  },
  {
    id: "c4", name: "Elena Vankov", title: "Frontend Engineer", location: "Amsterdam, NL",
    yearsExperience: 5, score: 87, email: "elena.vankov@example.com", resumeQuality: 86,
    skills: ["React","TypeScript","Next.js","Accessibility","Testing"],
    matchedSkills: ["React","TypeScript","Next.js","Accessibility","Testing"],
    missingSkills: ["Tailwind","Performance","GraphQL"],
    strengths: ["WCAG 2.2 compliance projects","Solid TS fundamentals"],
    gaps: ["No Tailwind in recent stack","Performance work not highlighted"],
    summary: "Accessibility-minded engineer with solid Next.js delivery experience.",
  },
  {
    id: "c5", name: "Diego Salas", title: "Full-stack (FE-leaning)", location: "Madrid, ES",
    yearsExperience: 5, score: 82, email: "diego.salas@example.com", resumeQuality: 80,
    skills: ["React","TypeScript","GraphQL","Node","Testing","Tailwind"],
    matchedSkills: ["React","TypeScript","GraphQL","Testing","Tailwind"],
    missingSkills: ["Next.js","Accessibility","Performance"],
    strengths: ["Strong API integration","BFF/GraphQL patterns"],
    gaps: ["Backend-leaning recent work","No Next.js"],
    summary: "Full-stack engineer who can move fast, but shifting back toward FE-only.",
  },
  {
    id: "c6", name: "Priya Raman", title: "UI Engineer", location: "Bengaluru, IN",
    yearsExperience: 4, score: 78, email: "priya.raman@example.com", resumeQuality: 82,
    skills: ["React","Tailwind","Framer Motion","Storybook","Design Systems"],
    matchedSkills: ["React","Tailwind"],
    missingSkills: ["TypeScript","Next.js","Testing","Accessibility","Performance","GraphQL"],
    strengths: ["Beautiful motion + interaction work","Design fluency"],
    gaps: ["Limited TypeScript adoption","Testing not evidenced"],
    summary: "Strong UI craft and motion. Needs ramp on TS-heavy codebases.",
  },
  {
    id: "c7", name: "Henrik Lund", title: "Frontend Engineer", location: "Copenhagen, DK",
    yearsExperience: 6, score: 75, email: "henrik.lund@example.com", resumeQuality: 70,
    skills: ["React","Vue","JavaScript","CSS","Tailwind"],
    matchedSkills: ["React","Tailwind"],
    missingSkills: ["TypeScript","Next.js","Testing","Accessibility","Performance","GraphQL"],
    strengths: ["Versatile across frameworks","Long product tenure"],
    gaps: ["Mostly JS, limited TS","Stack drift between roles"],
    summary: "Generalist FE engineer. Stack alignment requires investment.",
  },
  {
    id: "c8", name: "Sara Ibrahim", title: "Junior → Mid Frontend Dev", location: "Cairo, EG",
    yearsExperience: 2, score: 64, email: "sara.ibrahim@example.com", resumeQuality: 75,
    skills: ["React","TypeScript","Tailwind","Next.js"],
    matchedSkills: ["React","TypeScript","Tailwind","Next.js"],
    missingSkills: ["Testing","Accessibility","Performance","GraphQL"],
    strengths: ["Modern stack from day one","Fast learner per references"],
    gaps: ["Below required years (2 vs 4)","No senior-scope projects"],
    summary: "Promising mid-level on the right stack. Below seniority bar today.",
  },
  {
    id: "c9", name: "Tom Becker", title: "WordPress / Frontend Dev", location: "Munich, DE",
    yearsExperience: 9, score: 48, email: "tom.becker@example.com", resumeQuality: 55,
    skills: ["JavaScript","jQuery","WordPress","CSS","HTML"],
    matchedSkills: [],
    missingSkills: ["React","TypeScript","Next.js","Tailwind","Testing","Accessibility","Performance","GraphQL"],
    strengths: ["Long delivery history","Strong CSS/HTML fundamentals"],
    gaps: ["No React/TS","Stack mismatch with role"],
    summary: "Experienced web developer, but stack misaligned with the role.",
  },
  {
    id: "c10", name: "Linh Pham", title: "Mobile (RN) Developer", location: "Ho Chi Minh, VN",
    yearsExperience: 4, score: 41, email: "linh.pham@example.com", resumeQuality: 68,
    skills: ["React Native","TypeScript","Expo","Redux"],
    matchedSkills: ["TypeScript"],
    missingSkills: ["React (web)","Next.js","Tailwind","Testing","Accessibility","Performance","GraphQL"],
    strengths: ["Strong RN delivery","TS fluent"],
    gaps: ["Mobile-only background","No web app shipping"],
    summary: "Mobile-focused engineer. Major pivot needed for web-first role.",
  },
];