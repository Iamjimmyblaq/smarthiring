import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";
import { Link } from "@/lib/router-compat";
import {
  ArrowRight, Check, ChevronDown, FileSearch, ClipboardCheck, Video, Workflow,
  Menu, X, AlertCircle,
} from "lucide-react";
import hero from "@/assets/talenval-hiring-hero.jpg";

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

const capabilities = [
  { icon: FileSearch, title: "Resume intelligence", desc: "Every resume parsed, scored and ranked against the job in seconds — with the reasons shown." },
  { icon: ClipboardCheck, title: "Skills, proven", desc: "490+ validated, webcam-proctored assessments — coding, language, cognitive and role-specific." },
  { icon: Video, title: "Better interviews", desc: "AI video interviews with transcripts, composure signals and a full proctoring report." },
  { icon: Workflow, title: "One connected pipeline", desc: "Sourced to Hired in five stages, with automatic emails, offers and onboarding." },
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
            <a href="#platform" className="hover:text-cyan">Platform</a>
            <a href="#how-it-works" className="hover:text-cyan">How it works</a>
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
          <button onClick={() => setOpen((v) => !v)} aria-label="Menu" className="grid h-10 w-10 place-items-center rounded-[3px] border border-on-deep/25 bg-deep/35 text-on-deep md:hidden">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open && (
          <div className="mx-4 space-y-3 rounded-[5px] bg-deep p-5 text-on-deep md:hidden">
            {[["#platform", "Platform"], ["#how-it-works", "How it works"], ["#product", "Explore the product"]].map(([h, l]) => (
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

      {/* CAPABILITIES */}
      <section id="platform" className="py-24">
        <div className="mx-auto max-w-[1240px] px-6">
          <Kicker>What we make possible</Kicker>
          <h2 className="mt-5 max-w-2xl font-display text-4xl font-bold tracking-tight md:text-5xl">Every signal matters. See the full picture.</h2>
          <div className="mt-14 grid gap-px overflow-hidden rounded-[5px] border border-ed-border bg-ed-border sm:grid-cols-2 lg:grid-cols-4">
            {capabilities.map((f, i) => (
              <div key={f.title} className="flex flex-col bg-ed-bg p-7">
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-[3px] bg-deep text-cyan"><f.icon className="h-5 w-5" /></span>
                  <span className="font-display text-xs font-semibold text-ed-muted">0{i + 1} / 04</span>
                </div>
                <h3 className="mt-8 font-display text-lg font-bold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ed-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="bg-ed-tint py-24">
        <div className="mx-auto grid max-w-[1240px] gap-14 px-6 lg:grid-cols-[5fr_7fr]">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <Kicker>How it works</Kicker>
            <h2 className="mt-5 font-display text-4xl font-bold tracking-tight md:text-5xl">From application to answer.</h2>
            <p className="mt-5 text-ed-muted">Three steps replace weeks of manual screening.</p>
            <Link to="/demo" className="mt-6 inline-flex items-center gap-2 font-bold underline-offset-4 hover:underline">See the demo <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <ol className="divide-y divide-ed-border border-y border-ed-border">
            {[
              ["Bring in your candidates", "Drag and drop resumes in bulk, or collect applications from your own careers page."],
              ["Find the strongest fit", "Every applicant is ranked with an explainable score — skills, experience and resume quality."],
              ["Move forward with confidence", "Send assessments and AI interviews, share dossiers with managers and move people through your pipeline."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-6 py-8">
                <span className="font-display text-3xl font-bold text-cyan">0{i + 1}</span>
                <div>
                  <h3 className="font-display text-xl font-bold">{t}</h3>
                  <p className="mt-2 text-ed-muted">{d}</p>
                </div>
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
                  <button key={p.name} onClick={() => setSel(i)} className={`flex h-[62px] w-full items-center gap-3 border-b border-ed-border px-6 text-left transition-colors ${sel === i ? "bg-ed-tint" : "hover:bg-ed-tint/60"}`}>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[3px] bg-deep font-display text-xs font-bold text-cyan">#{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                    <span className="font-display font-bold">{p.overall}</span>
                  </button>
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

      {/* BEYOND */}
      <section className="bg-deep py-24 text-on-deep">
        <div className="mx-auto max-w-[1240px] px-6">
          <Kicker dark>Beyond the resume</Kicker>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {[
              { icon: ClipboardCheck, tone: "text-cyan", t: "490+ skills assessments", d: "Proctored with webcam monitoring and paste-blocking, or build your own tests for your L&D team." },
              { icon: Video, tone: "text-gold", t: "AI video interviews", d: "Candidates interview any time. You get a transcript, score, composure signals and a proctoring report." },
            ].map((b) => (
              <div key={b.t} className="rounded-[5px] bg-deep-raised p-8">
                <b.icon className={`h-7 w-7 ${b.tone}`} />
                <h3 className="mt-6 font-display text-2xl font-bold">{b.t}</h3>
                <p className="mt-3 text-on-deep-muted">{b.d}</p>
              </div>
            ))}
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
          <p className="text-xs">© {new Date().getFullYear()} Talenval</p>
        </div>
      </footer>
    </main>
  );
}
