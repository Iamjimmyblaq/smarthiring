import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/router-compat";
import {
  ArrowRight, Brain, CalendarCheck, Camera, Check, CheckCircle2, ChevronDown,
  ClipboardCheck, Clock3, Eye, FileCheck2, FilePenLine, FileSearch,
  Filter, Inbox, ListChecks, Menu, Mic, MonitorPlay, ShieldCheck,
  Upload, UserRoundCheck, Video, WandSparkles, X, AlertCircle,
} from "lucide-react";
import interviewImage from "@/assets/ai-interview-room.jpg";

function useSignedIn() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSignedIn(!!data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setSignedIn(!!session);
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  return signedIn;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="flex items-center gap-2 text-xs font-bold uppercase text-home-violet tracking-[0.2em]"><span className="h-1.5 w-1.5 rounded-full bg-home-violet" />{children}</p>;
}

function HomeAction({ to, children, secondary = false, className = "" }: { to: string; children: React.ReactNode; secondary?: boolean; className?: string }) {
  return <Button asChild variant={secondary ? "homeOutline" : "homePrimary"} className={`h-12 px-6 font-semibold ${className}`}><Link to={to}>{children}</Link></Button>;
}

function Brand() {
  return <span className="inline-flex items-center gap-2.5"><Logo withWordmark={false} size={36} /><span className="font-display text-lg font-bold text-home-text">Talenval</span></span>;
}

const problems = [
  { icon: Inbox, title: "200+ resumes per role", description: "Manual screening doesn't scale. Most resumes never get a real read." },
  { icon: Clock3, title: "23 hours per role", description: "Recruiters can spend almost a full workweek on initial screening alone." },
  { icon: ShieldCheck, title: "Inconsistent decisions", description: "Fatigue and bias quietly influence who makes it to the interview shortlist." },
];

const steps = [
  { icon: ListChecks, title: "Define the role", description: "Required skills, years of experience, must-haves and nice-to-haves — structured." },
  { icon: Upload, title: "Upload resumes", description: "Drag in PDF or DOCX files. Talenval parses and organizes them for review." },
  { icon: Brain, title: "Get ranked candidates", description: "See each applicant's score, strengths, gaps and fit summary in one place." },
];

const stages = [
  { icon: Inbox, title: "Sourced", description: "AI-ranked applicants" },
  { icon: Filter, title: "Screening", description: "Shortlist top fits" },
  { icon: CalendarCheck, title: "Interview", description: "AI video round & rating" },
  { icon: FilePenLine, title: "Offer", description: "Salary, dates, status" },
  { icon: UserRoundCheck, title: "Hired", description: "Onboarding checklist" },
];

const assessments = [
  { icon: ClipboardCheck, title: "490+ skills tests", description: "Coding, languages, cognitive, situational and oilfield skills across the library." },
  { icon: WandSparkles, title: "Build your own", description: "L&D teams can create company-specific tests with their own questions and scoring." },
  { icon: Camera, title: "Webcam proctored", description: "Camera monitoring, paste blocking and integrity flags on each attempt." },
  { icon: FileCheck2, title: "Scored PDF reports", description: "Review results individually or download assessment reports in bulk." },
];

const candidates = [
  { name: "Amara O.", role: "Senior Product Engineer", overall: 92, skills: 94, exp: 88, quality: 91, strength: "Led 3 product launches; strong TypeScript and system design.", gap: "Limited people-management experience." },
  { name: "Daniel K.", role: "Senior Product Engineer", overall: 84, skills: 86, exp: 82, quality: 80, strength: "Deep backend and data-pipeline experience.", gap: "Few examples of customer-facing work." },
  { name: "Priya S.", role: "Senior Product Engineer", overall: 77, skills: 75, exp: 80, quality: 78, strength: "Great product sense and design collaboration.", gap: "Skills test showed gaps in SQL." },
];

export default function Index() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const signedIn = useSignedIn();
  const candidate = candidates[selected];
  const actionTo = signedIn ? "/jobs" : "/auth";
  const actionLabel = signedIn ? "Go to dashboard" : "Start free trial";

  return (
    <main className="min-h-screen bg-home-base font-body text-home-text">
      <header className="relative z-20 border-b border-home-line/70">
        <div className="mx-auto flex h-20 max-w-[1280px] items-center justify-between gap-4 px-6">
          <Link to="/" aria-label="Talenval home"><Brand /></Link>
          <nav className="hidden items-center gap-7 text-sm text-home-muted md:flex">
            <a href="#solution" className="hover:text-home-text">Platform</a>
            <a href="#how-it-works" className="hover:text-home-text">How it works</a>
            <a href="#interviews" className="hover:text-home-text">AI interviews</a>
            <a href="#assessments" className="hover:text-home-text">Assessments</a>
            <Link to="/pricing" className="hover:text-home-text">Pricing</Link>
          </nav>
          <div className="hidden items-center gap-4 md:flex">
            {signedIn === true ? <HomeAction to="/jobs" className="h-9 text-xs">Go to dashboard</HomeAction> : signedIn === false ? <><Link to="/auth" className="text-sm font-semibold hover:text-home-violet">Sign in</Link><HomeAction to="/auth" className="h-9 text-xs">Start free</HomeAction></> : null}
          </div>
          <Button variant="homeOutline" size="icon" className="md:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((value) => !value)}>{open ? <X /> : <Menu />}</Button>
        </div>
        {open && <nav className="absolute inset-x-0 top-20 space-y-4 border-b border-home-line bg-home-base px-6 py-6 text-sm md:hidden">
          {[["#solution", "Platform"], ["#how-it-works", "How it works"], ["#interviews", "AI interviews"], ["#assessments", "Assessments"]].map(([href, label]) => <a key={href} href={href} className="block" onClick={() => setOpen(false)}>{label}</a>)}
          <Link to="/pricing" className="block" onClick={() => setOpen(false)}>Pricing</Link>
          {signedIn === true ? <HomeAction to="/jobs">Go to dashboard</HomeAction> : signedIn === false ? <div className="flex gap-3"><HomeAction to="/auth" secondary>Sign in</HomeAction><HomeAction to="/auth">Start free</HomeAction></div> : null}
        </nav>}
      </header>

      <section className="relative isolate flex min-h-[620px] items-center overflow-hidden py-16 md:min-h-[680px]">
        <div className="home-hero-glow pointer-events-none absolute inset-0 -z-10" />
        <div className="mx-auto grid w-full max-w-[1280px] items-center gap-14 px-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div>
            <SectionLabel>AI resume screening</SectionLabel>
            <h1 className="mt-7 max-w-[720px] font-display text-5xl font-bold leading-[1.07] sm:text-6xl lg:text-7xl">Hire smarter,<br /><span className="text-home-violet">not harder.</span></h1>
            <p className="mt-8 max-w-[580px] text-lg leading-relaxed text-home-muted">Talenval parses, scores and ranks applicants against your role, so you can focus on the people worth interviewing.</p>
            <div className="mt-10 flex flex-wrap gap-3">
              {signedIn !== null && <HomeAction to={actionTo}>{actionLabel}<ArrowRight /></HomeAction>}
              <HomeAction to="/demo" secondary>See demo</HomeAction>
            </div>
            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-home-muted">
              {["No credit card", "First 100 resumes free", "Set up in minutes"].map((text) => <li key={text} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-home-violet" />{text}</li>)}
            </ul>
          </div>
          <div className="relative mx-auto w-full max-w-[560px] pb-8" aria-label="Illustrative candidate match preview">
            <div className="rounded-[8px] border border-home-line bg-home-surface p-5 shadow-2xl sm:p-7">
              <div className="flex items-center gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-home-violet text-sm font-bold">JT</span><div className="min-w-0 flex-1"><p className="font-bold">Julian Thorne</p><p className="text-xs uppercase text-home-muted">Sr. Frontend Developer</p></div><div className="text-right"><b className="font-display text-3xl">96<span className="text-sm">%</span></b><p className="text-xs font-semibold uppercase text-home-violet">Match score</p></div></div>
              <div className="mt-7 h-2 rounded-full bg-home-line"><div className="home-score-track h-full w-[96%] rounded-full" /></div>
              <div className="mt-5 flex flex-wrap gap-2">{["React", "TypeScript", "Next.js", "GraphQL", "Accessibility"].map((skill) => <span key={skill} className="rounded-[5px] border border-home-line bg-home-surface-raised px-2.5 py-1 text-xs text-home-muted">{skill}</span>)}</div>
              <div className="mt-6 grid grid-cols-3 gap-3 border-t border-home-line pt-5 text-xs text-home-muted"><div>Skills match <b className="mt-1 block text-home-text">7 / 8</b></div><div>Experience <b className="mt-1 block text-home-text">7 years</b></div><div>Resume quality <b className="mt-1 block text-home-text">94 / 100</b></div></div>
            </div>
            <div className="absolute -bottom-2 -left-2 rounded-[8px] border border-home-violet/40 bg-home-surface px-5 py-4 shadow-xl sm:-left-8"><p className="text-[10px] font-bold uppercase text-home-muted tracking-[0.16em]">Processing</p><p className="mt-1 font-display text-lg font-bold">2.4s <span className="text-xs text-home-green">−70%</span></p><div className="mt-3 flex items-end gap-1.5">{[13, 18, 14, 25, 19, 22, 16].map((h, i) => <span key={i} className="w-5 rounded-t-[2px] bg-home-violet/60" style={{ height: h }} />)}</div></div>
            <p className="sr-only">Illustrative sample data.</p>
          </div>
        </div>
        <a href="#problem" aria-label="Discover more" className="absolute bottom-4 left-1/2 hidden -translate-x-1/2 text-home-muted hover:text-home-violet lg:block"><ChevronDown /></a>
      </section>

      <section id="problem" className="border-t border-home-line/60 py-20 md:py-28">
        <div className="mx-auto max-w-[1280px] px-6"><SectionLabel>The problem</SectionLabel><h2 className="mt-6 max-w-[940px] font-display text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">Recruiters drown in resumes. Great hires slip through the cracks.</h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">{problems.map(({ icon: Icon, title, description }) => <article key={title} className="rounded-[8px] border border-home-line bg-home-surface p-7"><span className="grid h-11 w-11 place-items-center rounded-[7px] border border-home-violet/30 bg-home-violet/10 text-home-violet"><Icon className="h-5 w-5" /></span><h3 className="mt-7 text-lg font-bold">{title}</h3><p className="mt-3 leading-relaxed text-home-muted">{description}</p></article>)}</div>
        </div>
      </section>

      <section id="solution" className="border-y border-home-line/60 py-20 md:py-28">
        <div className="mx-auto grid max-w-[1280px] items-center gap-12 px-6 lg:grid-cols-2 lg:gap-20"><div><SectionLabel>The solution</SectionLabel><h2 className="mt-6 font-display text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">Talenval reads every resume — and explains every score.</h2><p className="mt-6 text-lg leading-relaxed text-home-muted">Define the role once. Drop in resumes. Talenval ranks candidates by matched skills, experience, strengths and gaps, so you can shortlist with confidence.</p><ul className="mt-9 grid gap-4 text-sm sm:grid-cols-2">{["Explainable scoring", "Bulk PDF + DOCX upload", "Candidate shortlisting", "Resume quality scoring"].map((item) => <li key={item} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-home-violet" />{item}</li>)}</ul></div>
          <div className="rounded-[8px] border border-home-line bg-home-surface p-6 sm:p-8" aria-label="Illustrative score breakdown"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">Why this score?</h3><p className="mt-1 text-sm text-home-muted">Julian Thorne · Sr. Frontend Developer</p></div><div className="text-right"><span className="font-display text-3xl font-bold">96</span><p className="text-xs font-bold uppercase text-home-violet">Overall</p></div></div><div className="mt-9 space-y-5">{[["Required skills", "7 / 8", 88], ["Experience", "7 yrs vs 4 req.", 100], ["Resume quality", "94 / 100", 94], ["Nice-to-have skills", "2 / 3", 67]].map(([label, value, percent]) => <div key={String(label)}><div className="mb-2 flex justify-between gap-3 text-sm"><span className="text-home-muted">{label}</span><b>{value}</b></div><div className="h-1.5 rounded-full bg-home-line"><div className="home-score-track h-full rounded-full" style={{ width: `${percent}%` }} /></div></div>)}</div><p className="mt-6 text-xs text-home-muted">Illustrative sample data.</p></div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 md:py-28"><div className="mx-auto max-w-[1280px] px-6"><div className="text-center"><div className="flex justify-center"><SectionLabel>How it works</SectionLabel></div><h2 className="mt-6 font-display text-3xl font-bold sm:text-4xl md:text-5xl">From inbox to shortlist in three steps.</h2></div><div className="mt-14 grid gap-5 md:grid-cols-3">{steps.map(({ icon: Icon, title, description }, index) => <article key={title} className="rounded-[8px] border border-home-line bg-home-surface p-7"><p className="font-mono text-xs text-home-violet">0{index + 1}</p><Icon className="mt-6 h-6 w-6" /><h3 className="mt-6 text-lg font-bold">{title}</h3><p className="mt-3 leading-relaxed text-home-muted">{description}</p></article>)}</div></div></section>

      <section id="pipeline" className="border-y border-home-line/60 py-20 md:py-28"><div className="mx-auto max-w-[1280px] px-6"><div className="text-center"><div className="flex justify-center"><SectionLabel>Full recruitment lifecycle</SectionLabel></div><h2 className="mt-6 font-display text-3xl font-bold sm:text-4xl md:text-5xl">One pipeline. Every stage. Zero spreadsheets.</h2><p className="mt-5 text-home-muted">From sourcing to onboarding — track candidates through a connected five-stage workflow.</p></div><div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{stages.map(({ icon: Icon, title, description }, index) => <div key={title} className="rounded-[8px] border border-home-line bg-home-surface p-6 text-center"><p className="font-mono text-xs text-home-violet">0{index + 1}</p><Icon className="mx-auto mt-4 h-6 w-6" /><h3 className="mt-5 font-bold">{title}</h3><p className="mt-2 text-sm text-home-muted">{description}</p></div>)}</div></div></section>

      <section id="interviews" className="py-20 md:py-28"><div className="mx-auto grid max-w-[1280px] items-center gap-12 px-6 lg:grid-cols-2 lg:gap-16"><div className="relative pb-6"><img src={interviewImage} alt="Illustration of Talenval's AI video interview room with candidate video, audio waveform, and results" loading="lazy" width={1100} height={736} className="w-full rounded-[8px] border border-home-line object-cover" /><div className="absolute bottom-0 right-0 rounded-[8px] border border-home-violet/40 bg-home-surface px-5 py-3 shadow-xl sm:right-4"><p className="text-xs font-bold uppercase text-home-muted">AI verdict</p><p className="mt-1 font-display text-xl font-bold">88 <span className="text-xs font-normal text-home-green">Advance to offer</span></p></div></div><div><SectionLabel>AI video interview</SectionLabel><h2 className="mt-6 font-display text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">An AI interviewer that actually sits in the room.</h2><p className="mt-6 text-lg leading-relaxed text-home-muted">Send one link. Candidates join with camera and microphone; the AI asks role-specific questions aloud, records answers and prepares a scored report with integrity signals for your team.</p><ul className="mt-8 grid gap-5 text-sm sm:grid-cols-2">{[{ icon: Video, text: "Live video round" }, { icon: Mic, text: "Natural voice Q&A" }, { icon: MonitorPlay, text: "Screen share capture" }, { icon: Eye, text: "Proctoring & integrity checks" }].map(({ icon: Icon, text }) => <li key={text} className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-[7px] border border-home-violet/30 bg-home-violet/10 text-home-violet"><Icon className="h-4 w-4" /></span>{text}</li>)}</ul><div className="mt-9 flex flex-wrap gap-3">{signedIn !== null && <HomeAction to={signedIn ? "/interviews" : "/auth"}><Video />Run an AI interview</HomeAction>}<HomeAction to="/demo" secondary>See it in action</HomeAction></div></div></div></section>

      <section id="assessments" className="border-y border-home-line/60 py-20 md:py-28"><div className="mx-auto max-w-[1280px] px-6"><SectionLabel>Skills assessments</SectionLabel><h2 className="mt-6 max-w-[890px] font-display text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">Prove the skill before the offer — or build the test yourself.</h2><p className="mt-6 max-w-[900px] text-lg leading-relaxed text-home-muted">Send from a library of 490+ tests — coding, language, cognitive, situational, role-specific and oilfield competencies. Learning and development teams can also author tailored assessments with their own questions, scoring and time limit.</p><div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{assessments.map(({ icon: Icon, title, description }) => <article key={title} className="rounded-[8px] border border-home-line bg-home-surface p-7"><span className="grid h-11 w-11 place-items-center rounded-[7px] border border-home-violet/30 bg-home-violet/10 text-home-violet"><Icon className="h-5 w-5" /></span><h3 className="mt-6 font-bold">{title}</h3><p className="mt-3 text-sm leading-relaxed text-home-muted">{description}</p></article>)}</div><div className="mt-10 flex flex-wrap gap-3">{signedIn !== null && <HomeAction to={signedIn ? "/assessments" : "/auth"}><ClipboardCheck />Start assessing candidates</HomeAction>}<HomeAction to="/pricing" secondary>See assessment allowances</HomeAction></div></div></section>

      <section id="product" className="py-20 md:py-28"><div className="mx-auto max-w-[1280px] px-6"><SectionLabel>Explore the product</SectionLabel><h2 className="mt-6 font-display text-3xl font-bold sm:text-4xl md:text-5xl">Not another black box.</h2><p className="mt-4 text-home-muted">Select a candidate to see why they ranked where they did.</p><div className="mt-10 overflow-hidden rounded-[8px] border border-home-line bg-home-surface"><div className="flex items-center justify-between gap-4 border-b border-home-line px-6 py-4 text-xs font-bold uppercase text-home-muted tracking-[0.16em]"><span>Talenval / Candidate insights</span><span className="hidden sm:inline">{candidate.role}</span></div><div className="grid md:grid-cols-[300px_1fr]"><div className="border-b border-home-line md:border-b-0 md:border-r">{candidates.map((person, index) => <Button key={person.name} variant="ghost" onClick={() => setSelected(index)} aria-pressed={selected === index} className={`flex h-16 w-full justify-start rounded-none border-b border-home-line px-5 text-left hover:bg-home-surface-raised hover:text-home-text ${selected === index ? "bg-home-surface-raised text-home-text" : "text-home-muted"}`}><span className="grid h-8 w-8 shrink-0 place-items-center rounded-[4px] bg-home-violet/20 text-xs text-home-violet">#{index + 1}</span><span className="min-w-0 flex-1 truncate">{person.name}</span><b>{person.overall}</b></Button>)}</div><div className="p-6 sm:p-8"><div className="flex items-start justify-between gap-4"><h3 className="font-display text-2xl font-bold">{candidate.name}</h3><span className="font-display text-3xl font-bold text-home-violet">{candidate.overall}</span></div><div className="mt-7 space-y-4">{[["Skills matched", candidate.skills], ["Experience", candidate.exp], ["Resume quality", candidate.quality]].map(([label, value]) => <div key={String(label)}><div className="mb-2 flex justify-between text-sm"><span>{label}</span><b>{value}</b></div><div className="h-2 rounded-full bg-home-line"><div className="home-score-track h-full rounded-full" style={{ width: `${value}%` }} /></div></div>)}</div><p className="mt-6 flex gap-2 text-sm"><Check className="h-4 w-4 shrink-0 text-home-green" />{candidate.strength}</p><p className="mt-3 flex gap-2 text-sm text-home-muted"><AlertCircle className="h-4 w-4 shrink-0 text-home-violet" />{candidate.gap}</p></div></div><p className="border-t border-home-line px-6 py-3 text-xs text-home-muted">Illustrative sample data.</p></div></div></section>

      <section className="border-t border-home-line/60 bg-home-surface py-20 md:py-24"><div className="mx-auto max-w-[1280px] px-6"><h2 className="max-w-[800px] font-display text-3xl font-bold sm:text-4xl md:text-5xl">Build a team that moves you forward.</h2>{signedIn !== null && <HomeAction to={actionTo} className="mt-8">{actionLabel}<ArrowRight /></HomeAction>}</div></section>
      <footer className="border-t border-home-line bg-home-base py-12 text-home-muted"><div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-6 md:flex-row md:items-center md:justify-between"><div><Brand /><p className="mt-3 text-xs font-bold uppercase text-home-violet tracking-[0.16em]">See more. Hire better.</p></div><nav className="flex flex-wrap gap-6 text-sm"><Link to="/pricing" className="hover:text-home-text">Pricing</Link><Link to="/demo" className="hover:text-home-text">Demo</Link><Link to="/about" className="hover:text-home-text">About</Link><Link to="/faq" className="hover:text-home-text">FAQ</Link><Link to="/api-docs" className="hover:text-home-text">API</Link></nav><p className="text-xs">© {new Date().getFullYear()} Talenval</p></div></footer>
    </main>
  );
}