import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/router-compat";
import {
  ArrowRight, Check, ChevronDown, ClipboardCheck, Video,
  Menu, X, AlertCircle, Clock3, ShieldCheck, Upload, ListChecks, Brain,
  Filter, CalendarCheck, FilePenLine, UserRoundCheck, Mic, MonitorUp,
  Eye, WandSparkles, Camera, FileCheck2, Inbox,
} from "lucide-react";
import hero from "@/assets/talenval-hiring-hero.jpg";
import interviewRoom from "@/assets/ai-interview-room.jpg";

const btnHero = "inline-flex h-12 items-center justify-center gap-2 rounded-[3px] bg-cyan px-6 text-sm font-bold text-deep transition-colors hover:bg-cyan-soft";
const btnOutline = "inline-flex h-12 items-center justify-center gap-2 rounded-[3px] border border-on-deep/50 bg-deep/35 px-6 text-sm font-bold text-on-deep transition-colors hover:border-cyan hover:text-cyan";

function Kicker({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <p className={`flex items-center gap-3 text-xs font-bold uppercase tracking-[0.22em] ${dark ? "text-cyan" : "text-ed-fg"}`}>
      <span className="h-px w-[23px] bg-cyan" />
      {children}
    </p>
  );
}

function Brand() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-[4px] bg-on-deep">
        <Logo withWordmark={false} size={30} />
      </span>
      <span className="font-display text-lg font-bold tracking-tight text-on-deep">Talenval</span>
    </span>
  );
}

function useSignedIn() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => data.subscription.unsubscribe();
  }, []);
  return signedIn;
}

const problems = [
  { icon: Inbox, title: "Too many resumes", desc: "Manual screening doesn't scale. Strong applicants can get buried in the pile." },
  { icon: Clock3, title: "Hours lost per role", desc: "Reading every application by hand takes time away from meaningful conversations." },
  { icon: ShieldCheck, title: "Inconsistent decisions", desc: "Fatigue and bias can quietly influence who makes it to the shortlist." },
];

const steps = [
  { icon: ListChecks, title: "Define the role", desc: "Set the required skills, experience and the qualities that matter to your team." },
  { icon: Upload, title: "Upload resumes", desc: "Bring in PDF or DOCX resumes in bulk, or collect applications through your careers page." },
  { icon: Brain, title: "Get ranked candidates", desc: "See each person's score, strengths, gaps and fit summary in one clear view." },
];

const stages = [
  { icon: Inbox, title: "Sourced", desc: "Applications collected" },
  { icon: Filter, title: "Screening", desc: "Best fits shortlisted" },
  { icon: CalendarCheck, title: "Interview", desc: "AI video round & rating" },
  { icon: FilePenLine, title: "Offer", desc: "Decision & offer details" },
  { icon: UserRoundCheck, title: "Hired", desc: "Onboarding checklist" },
];

const assessmentFeatures = [
  { icon: ClipboardCheck, title: "490+ validated tests", desc: "Coding, language, cognitive, situational, role-specific and oilfield skills." },
  { icon: WandSparkles, title: "Build your own", desc: "L&D teams can create company-specific tests with their own questions and scoring." },
  { icon: Camera, title: "Webcam proctored", desc: "Camera monitoring, paste blocking and integrity checks during each attempt." },
  { icon: FileCheck2, title: "Scored PDF reports", desc: "Review results individually or download them together for your team." },
];

const candidates = [
  { name: "Amara O.", role: "Senior Product Engineer", overall: 92, skills: 94, exp: 88, quality: 91, strength: "Led 3 product launches; strong TypeScript and system design.", gap: "Limited people-management experience." },
  { name: "Daniel K.", role: "Senior Product Engineer", overall: 84, skills: 86, exp: 82, quality: 80, strength: "Deep backend and data-pipeline experience.", gap: "Few examples of customer-facing work." },
  { name: "Priya S.", role: "Senior Product Engineer", overall: 77, skills: 75, exp: 80, quality: 78, strength: "Great product sense and design collaboration.", gap: "Skills test showed gaps in SQL." },
];

export default function Index() {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const signedIn = useSignedIn();
  const c = candidates[sel]!;

  return (
    <main className="min-h-screen bg-ed-bg font-body text-ed-fg">
      {/* HEADER */}
      <header className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto flex h-20 max-w-[1240px] items-center justify-between px-6">
          <Link to="/" aria-label="Talenval home"><Brand /></Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-on-deep-muted md:flex">
            <a href="#solution" className="hover:text-cyan">Platform</a>
            <a href="#how-it-works" className="hover:text-cyan">How it works</a>
            <a href="#assessments" className="hover:text-cyan">Assessments</a>
            <a href="#product" className="hover:text-cyan">Explore the product</a>
            <Link to="/pricing" className="hover:text-cyan">Pricing</Link>
          </nav>
          <div className="hidden items-center gap-4 md:flex">
            {signedIn ? (
              <Link to="/jobs" className="inline-flex h-9 items-center rounded-[3px] bg-cyan px-4 text-xs font-bold text-deep hover:bg-cyan-soft">Go to dashboard</Link>
            ) : (
              <>
                <Link to="/auth" className="text-sm font-bold text-on-deep hover:text-cyan">Sign in</Link>
                <Link to="/auth" className="inline-flex h-9 items-center rounded-[3px] bg-cyan px-4 text-xs font-bold text-deep hover:bg-cyan-soft">Start free</Link>
              </>
            )}
          </div>
            <Button variant="ghost" size="icon" onClick={() => setOpen((v) => !v)} aria-label="Menu" className="grid h-10 w-10 place-items-center rounded-[3px] border border-on-deep/25 bg-deep/35 text-on-deep md:hidden">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
        </div>
        {open && (
          <div className="mx-4 space-y-3 rounded-[5px] bg-deep p-5 text-on-deep md:hidden">
            {[["#solution", "Platform"], ["#how-it-works", "How it works"], ["#assessments", "Assessments"], ["#product", "Explore the product"]].map(([h, l]) => (
              <a key={h} href={h} onClick={() => setOpen(false)} className="block text-sm">{l}</a>
            ))}
            <Link to="/pricing" className="block text-sm">Pricing</Link>
            <div className="flex gap-3 pt-2">
              {signedIn ? (
                <Link to="/jobs" className={`${btnHero} h-10 flex-1`}>Go to dashboard</Link>
              ) : (
                <>
                  <Link to="/auth" className={`${btnOutline} h-10 flex-1`}>Sign in</Link>
                  <Link to="/auth" className={`${btnHero} h-10 flex-1`}>Start free</Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="relative flex min-h-[740px] items-center overflow-hidden bg-deep">
        <img src={hero} alt="Professional ascending illuminated steps toward a modern office at dusk" width={1920} height={1088} fetchPriority="high" className="absolute inset-0 h-full w-full object-cover object-[70%_center]" />
        <div className="hero-shade absolute inset-0" />
        <div className="relative mx-auto w-full max-w-[1240px] px-6 pb-20 pt-32">
          <div className="max-w-2xl">
            <Kicker dark>The intelligent way to hire</Kicker>
            <h1 className="mt-6 font-display text-[clamp(2.75rem,7vw,5.5rem)] font-bold leading-[1.02] tracking-tight text-on-deep">
              See the person. Not just the <span className="text-cyan">paper.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-on-deep-muted">
              Talenval screens every resume, tests real skills and runs AI video interviews — so you shortlist the right people in minutes, with reasons you can trust.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to={signedIn ? "/jobs" : "/auth"} className={btnHero}>{signedIn ? "Go to dashboard" : "Start free trial"} <ArrowRight className="h-4 w-4" /></Link>
              <Link to="/demo" className={btnOutline}>Explore Talenval</Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-on-deep">
              {["No credit card", "First 100 resumes free", "Set up in minutes"].map((t) => (
                <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 text-cyan" />{t}</li>
              ))}
            </ul>
          </div>
        </div>
        <a href="#metrics" className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-xs uppercase tracking-[0.22em] text-on-deep-muted hover:text-cyan">
          Discover more <ChevronDown className="h-4 w-4 animate-bounce" />
        </a>
      </section>

      {/* METRICS */}
      <section id="metrics" className="border-t border-on-deep/10 bg-deep">
        <div className="mx-auto grid max-w-[1240px] grid-cols-2 gap-px px-6 py-12 md:grid-cols-4">
          {[["70%", "less time screening"], ["490+", "skills assessments"], ["5", "connected hiring stages"], ["1", "clear view of every candidate"]].map(([n, l]) => (
            <div key={l} className="py-4 md:border-l md:border-on-deep/10 md:pl-8 first:md:border-l-0 first:md:pl-0">
              <div className="font-display text-4xl font-bold text-cyan md:text-5xl">{n}</div>
              <div className="mt-2 text-sm text-on-deep-muted">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* THE PROBLEM */}
      <section className="py-24">
        <div className="mx-auto max-w-[1240px] px-6">
          <Kicker>The problem</Kicker>
          <h2 className="mt-5 max-w-4xl font-display text-4xl font-bold md:text-5xl">Great hires shouldn't get lost in a stack of resumes.</h2>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {problems.map((item) => (
              <div key={item.title} className="rounded-[5px] border border-ed-border bg-card p-7">
                <item.icon className="h-6 w-6 text-ed-fg" />
                <h3 className="mt-8 font-display text-lg font-bold">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ed-muted">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THE SOLUTION */}
      <section id="solution" className="bg-ed-tint py-24">
        <div className="mx-auto grid max-w-[1240px] items-center gap-12 px-6 lg:grid-cols-2 lg:gap-20">
          <div>
            <Kicker>The solution</Kicker>
            <h2 className="mt-5 font-display text-4xl font-bold md:text-5xl">Talenval reads every resume — and explains every score.</h2>
            <p className="mt-6 text-lg leading-relaxed text-ed-muted">Define the role once. Bring in resumes. Talenval ranks applicants with explainable AI — matched skills, experience, strengths and gaps — so you can shortlist with confidence.</p>
            <ul className="mt-8 grid gap-4 text-sm font-medium sm:grid-cols-2">
              {["Explainable scoring", "Bulk upload PDF + DOCX", "Skills and experience match", "Resume quality scoring"].map((feature) => (
                <li key={feature} className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-ed-success" />{feature}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-[8px] border border-ed-border bg-card p-6 soft-shadow sm:p-8" aria-label="Illustrative candidate score breakdown">
            <div className="flex items-start justify-between gap-4">
              <div><h3 className="font-display text-lg font-bold">Why this score?</h3><p className="mt-1 text-sm text-ed-muted">Amara O. · Senior Product Engineer</p></div>
              <div className="text-right"><strong className="font-display text-4xl text-ed-fg">92</strong><p className="text-xs font-bold uppercase text-ed-muted">Overall</p></div>
            </div>
            <div className="mt-9 space-y-5">
              {[["Required skills", "94 / 100", 94], ["Experience", "88 / 100", 88], ["Resume quality", "91 / 100", 91], ["Role fit", "92 / 100", 92]].map(([label, value, score]) => (
                <div key={label as string}><div className="mb-2 flex justify-between gap-2 text-sm"><span className="text-ed-muted">{label}</span><strong>{value}</strong></div><div className="h-2 rounded-full bg-ed-tint"><div className="h-full rounded-full bg-cyan" style={{ width: `${score}%` }} /></div></div>
              ))}
            </div>
            <p className="mt-7 border-t border-ed-border pt-4 text-xs text-ed-muted">Illustrative sample data.</p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24">
        <div className="mx-auto max-w-[1240px] px-6">
          <Kicker>How it works</Kicker>
          <h2 className="mt-5 font-display text-4xl font-bold md:text-5xl">From inbox to shortlist in three steps.</h2>
          <ol className="mt-12 grid gap-4 md:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title} className="rounded-[5px] border border-ed-border bg-card p-7">
                <span className="font-display text-sm font-bold text-ed-muted">0{i + 1}</span>
                <step.icon className="mt-6 h-7 w-7 text-ed-fg" />
                <h3 className="mt-6 font-display text-xl font-bold">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ed-muted">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FULL LIFECYCLE */}
      <section className="bg-ed-tint py-24">
        <div className="mx-auto max-w-[1240px] px-6">
          <Kicker>Full recruitment lifecycle</Kicker>
          <h2 className="mt-5 font-display text-4xl font-bold md:text-5xl">One pipeline. Every stage. Zero spreadsheets.</h2>
          <p className="mt-5 text-ed-muted">From sourcing through onboarding, keep every candidate moving in one connected workflow.</p>
          <ol className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {stages.map((stage, i) => (
              <li key={stage.title} className="rounded-[5px] border border-ed-border bg-card p-6">
                <span className="font-display text-xs font-bold text-ed-muted">0{i + 1}</span>
                <stage.icon className="mt-5 h-7 w-7 text-ed-fg" />
                <h3 className="mt-5 font-display text-lg font-bold">{stage.title}</h3>
                <p className="mt-2 text-sm text-ed-muted">{stage.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* PRODUCT DEMO */}
      <section id="product" className="py-24">
        <div className="mx-auto max-w-[1240px] px-6">
          <Kicker>Explore the product</Kicker>
          <h2 className="mt-5 max-w-2xl font-display text-4xl font-bold tracking-tight md:text-5xl">Not another black box.</h2>
          <p className="mt-4 max-w-xl text-ed-muted">Click a candidate to see exactly why they ranked where they did.</p>
          <div className="mt-12 overflow-hidden rounded-[8px] border border-ed-border bg-card soft-shadow">
            <div className="flex items-center justify-between bg-deep px-6 py-4 text-xs font-bold uppercase tracking-[0.22em] text-on-deep">
              <span>Talenval <span className="text-cyan">/</span> Candidate insights</span>
              <span className="hidden text-on-deep-muted sm:inline">{c.role}</span>
            </div>
            <div className="grid md:grid-cols-[320px_1fr]">
              <div className="border-b border-ed-border md:border-b-0 md:border-r">
                {candidates.map((p, i) => (
                  <Button variant="ghost" key={p.name} onClick={() => setSel(i)} className={`flex h-[62px] w-full justify-start rounded-none border-b border-ed-border px-6 text-left transition-colors ${sel === i ? "bg-ed-tint" : "hover:bg-ed-tint/60"}`}>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[3px] bg-deep font-display text-xs font-bold text-cyan">#{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                    <span className="font-display font-bold">{p.overall}</span>
                  </Button>
                ))}
              </div>
              <div className="p-6 sm:p-8" key={sel}>
                <div className="flex items-baseline justify-between">
                  <h3 className="font-display text-2xl font-bold">{c.name}</h3>
                  <span className="font-display text-3xl font-bold text-cyan">{c.overall}</span>
                </div>
                <div className="mt-6 space-y-4">
                  {[["Skills matched", c.skills], ["Experience", c.exp], ["Resume quality", c.quality]].map(([l, v]) => (
                    <div key={l as string}>
                      <div className="mb-1.5 flex justify-between text-sm"><span>{l}</span><span className="font-bold">{v}</span></div>
                      <div className="h-2 overflow-hidden rounded-full bg-ed-tint"><div className="score-fill h-full rounded-full bg-cyan" style={{ width: `${v}%` }} /></div>
                    </div>
                  ))}
                </div>
                <p className="mt-6 flex gap-2 text-sm"><Check className="h-4 w-4 shrink-0 text-ed-success" />{c.strength}</p>
                <p className="mt-2 flex gap-2 text-sm text-ed-muted"><AlertCircle className="h-4 w-4 shrink-0 text-gold" />{c.gap}</p>
              </div>
            </div>
            <p className="border-t border-ed-border px-6 py-3 text-xs text-ed-muted">Illustrative sample data.</p>
          </div>
        </div>
      </section>

      {/* AI INTERVIEW */}
      <section id="ai-interviews" className="bg-deep py-24 text-on-deep">
        <div className="mx-auto grid max-w-[1240px] items-center gap-12 px-6 lg:grid-cols-2 lg:gap-20">
          <div className="overflow-hidden rounded-[6px] border border-on-deep/15">
            <img src={interviewRoom} alt="Candidate taking part in a video interview" loading="lazy" width={1200} height={800} className="aspect-[4/3] w-full object-cover" />
          </div>
          <div>
            <Kicker dark>AI video interview</Kicker>
            <h2 className="mt-5 font-display text-4xl font-bold md:text-5xl">An AI interviewer that actually sits in the room.</h2>
            <p className="mt-6 text-lg leading-relaxed text-on-deep-muted">Send one link. Candidates join with camera and microphone; the AI asks role-specific questions aloud and returns a transcript, score and proctoring report for your team.</p>
            <ul className="mt-8 grid gap-5 text-sm sm:grid-cols-2">
              {[{ icon: Video, label: "Live video round" }, { icon: Mic, label: "Natural voice Q&A" }, { icon: MonitorUp, label: "Screen share capture" }, { icon: Eye, label: "Integrity checks" }].map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3"><Icon className="h-5 w-5 shrink-0 text-cyan" />{label}</li>
              ))}
            </ul>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to={signedIn ? "/interviews" : "/auth"} className={btnHero}>Run an AI interview <ArrowRight className="h-4 w-4" /></Link>
              <Link to="/demo" className={btnOutline}>See it in action</Link>
            </div>
          </div>
        </div>
      </section>

      {/* SKILLS ASSESSMENTS */}
      <section id="assessments" className="py-24">
        <div className="mx-auto max-w-[1240px] px-6">
          <Kicker>Skills assessments</Kicker>
          <h2 className="mt-5 max-w-4xl font-display text-4xl font-bold md:text-5xl">Prove the skill before the offer — or build the test yourself.</h2>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-ed-muted">Choose from 490+ validated tests across coding, language, cognitive, situational, role-specific and oilfield skills. Your learning and development team can also create tailored assessments with their own questions and scoring.</p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {assessmentFeatures.map((item) => (
              <div key={item.title} className="rounded-[5px] border border-ed-border bg-card p-7">
                <item.icon className="h-7 w-7 text-ed-fg" />
                <h3 className="mt-7 font-display text-lg font-bold">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ed-muted">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link to={signedIn ? "/assessments" : "/auth"} className="inline-flex h-12 items-center gap-2 rounded-[3px] bg-deep px-6 text-sm font-bold text-on-deep hover:bg-deep-raised">Start assessing candidates <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/pricing" className="inline-flex h-12 items-center gap-2 rounded-[3px] border border-ed-border px-6 text-sm font-bold hover:bg-ed-tint">See assessment allowances</Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-deep py-28 text-on-deep">
        <img src={hero} alt="" aria-hidden loading="lazy" width={1920} height={1088} className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="hero-shade absolute inset-0" />
        <div className="relative mx-auto max-w-[1240px] px-6">
          <h2 className="max-w-2xl font-display text-4xl font-bold tracking-tight md:text-6xl">Build a team that moves you forward.</h2>
          <Link to={signedIn ? "/jobs" : "/auth"} className={`${btnHero} mt-9`}>{signedIn ? "Go to dashboard" : "Start free trial"} <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-on-deep/10 bg-deep py-12 text-on-deep-muted">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-8 px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <Brand />
            <p className="mt-3 text-xs font-bold uppercase tracking-[0.22em] text-cyan">See more. Hire better.</p>
          </div>
          <nav className="flex flex-wrap gap-6 text-sm">
            <Link to="/pricing" className="hover:text-cyan">Pricing</Link>
            <Link to="/demo" className="hover:text-cyan">Demo</Link>
            <Link to="/about" className="hover:text-cyan">About</Link>
            <Link to="/faq" className="hover:text-cyan">FAQ</Link>
            <Link to="/api-docs" className="hover:text-cyan">API</Link>
          </nav>
          <div className="flex flex-col gap-1 text-xs">
            <a href="mailto:support@talenval.com" className="hover:text-cyan">Support: support@talenval.com</a>
            <a href="mailto:sales@talenval.com" className="hover:text-cyan">Sales: sales@talenval.com</a>
            <a href="mailto:founders@talenval.com" className="hover:text-cyan">Investors: founders@talenval.com</a>
            <p className="mt-2">© {new Date().getFullYear()} Talenval</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
