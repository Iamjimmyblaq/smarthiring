import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import MarketingNav from "@/components/marketing/MarketingNav";
import {
  ArrowRight, Sparkles, Upload, Brain, ListChecks, Zap, Target, Filter,
  ShieldCheck, BarChart3, Inbox, Clock, CheckCircle2,
  Users, CalendarCheck, FileSignature, UserCheck,
} from "lucide-react";

const Index = () => {
  useEffect(() => {
    document.title = "SmartHire — Hire Smarter, Not Harder";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "AI-powered resume screening that ranks every applicant in seconds and cuts screening time by 70%.");
    document.documentElement.classList.add("theme-marketing");
    document.body.classList.add("theme-marketing");
    return () => {
      document.documentElement.classList.remove("theme-marketing");
      document.body.classList.remove("theme-marketing");
    };
  }, []);

  return (
    <main className="theme-marketing min-h-screen">
      <MarketingNav />

      {/* HERO */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/4 size-[800px] rounded-full bg-brand/15 blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/4 size-[600px] rounded-full bg-brand-2/15 blur-[120px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-xs font-bold tracking-widest uppercase mb-8">
              <span className="size-1.5 rounded-full bg-brand animate-pulse" /> AI Resume Screening
            </div>
            <h1 className="text-5xl lg:text-7xl font-semibold tracking-tight leading-[1.05] text-foreground">
              Hire Smarter,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-brand-2">Not Harder.</span>
            </h1>
            <p className="mt-7 text-lg text-muted-foreground max-w-[52ch] leading-relaxed">
              SmartHire's AI parses, scores and ranks every applicant against your role — cutting screening time by 70% so you spend it on the people worth interviewing.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link to="/auth">
                <Button size="lg" className="rounded-xl bg-brand text-white hover:bg-brand/90 shadow-[var(--shadow-brand)] gap-2 px-7">
                  Start Free Trial <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/demo">
                <Button size="lg" variant="outline" className="rounded-xl border-white/15 bg-white/5 text-foreground hover:bg-white/10 px-7">
                  See Demo
                </Button>
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted-foreground">
              {["No credit card", "Free for 100 resumes", "Setup in 60 seconds"].map((b) => (
                <span key={b} className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-brand" />{b}</span>
              ))}
            </div>
          </div>

          {/* Hero product mockup */}
          <div className="lg:col-span-6 relative">
            <HeroMockup />
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="border-y border-white/5 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-sm text-muted-foreground">Trusted by lean hiring teams shipping fast</p>
          <div className="flex flex-wrap items-center gap-x-10 gap-y-4 opacity-60">
            {["STRATA", "CORE.OS", "QUANTUM", "NEURAL.AI", "VANGUARD"].map((b) => (
              <span key={b} className="text-sm font-bold tracking-[0.2em] text-muted-foreground">{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="py-28">
        <div className="max-w-6xl mx-auto px-6">
          <SectionLabel>The Problem</SectionLabel>
          <h2 className="mt-3 text-4xl md:text-5xl font-semibold tracking-tight text-foreground max-w-3xl">
            Recruiters drown in resumes. Great hires slip through the cracks.
          </h2>
          <div className="mt-14 grid md:grid-cols-3 gap-6">
            {[
              { icon: Inbox, title: "200+ resumes per role", desc: "Manual screening doesn't scale. Most resumes never get a real read." },
              { icon: Clock, title: "23 hours per role", desc: "The average recruiter wastes nearly a full work-week on initial screening alone." },
              { icon: ShieldCheck, title: "Inconsistent decisions", desc: "Fatigue and bias quietly influence who makes it to the interview shortlist." },
            ].map((p) => (
              <Card key={p.title} icon={<p.icon className="h-5 w-5" />} title={p.title} desc={p.desc} />
            ))}
          </div>
        </div>
      </section>

      {/* SOLUTION */}
      <section className="py-28 border-t border-white/5 bg-gradient-to-b from-transparent via-brand/[0.04] to-transparent">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <SectionLabel>The Solution</SectionLabel>
            <h2 className="mt-3 text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
              SmartHire reads every resume — and explains every score.
            </h2>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              Define the role once. Drop in resumes. SmartHire ranks every candidate with explainable AI — matched skills, experience deltas, strengths and gaps — so you can confidently shortlist in minutes, not days.
            </p>
            <div className="mt-8 grid sm:grid-cols-2 gap-4">
              {[
                "Explainable scoring (no black box)",
                "Bulk upload PDF + DOCX",
                "Top 5 auto-shortlist",
                "Resume quality scoring",
              ].map((b) => (
                <span key={b} className="inline-flex items-center gap-2 text-sm text-foreground/90">
                  <CheckCircle2 className="h-4 w-4 text-brand shrink-0" /> {b}
                </span>
              ))}
            </div>
          </div>
          <div>
            <ScoreBreakdownMockup />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-28 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <SectionLabel center>How it works</SectionLabel>
          <h2 className="mt-3 text-center text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
            From inbox to shortlist in three steps.
          </h2>
          <div className="mt-16 grid md:grid-cols-3 gap-6">
            {[
              { n: "01", icon: ListChecks, title: "Define the role", desc: "Required skills, years of experience, must-haves and nice-to-haves — structured." },
              { n: "02", icon: Upload, title: "Upload resumes", desc: "Drag in hundreds of PDFs or DOCX files. We parse them in seconds." },
              { n: "03", icon: Brain, title: "Get ranked candidates", desc: "Every applicant scored with strengths, gaps and a fit summary — instantly." },
            ].map((s) => (
              <div key={s.n} className="relative rounded-2xl border border-white/10 bg-card p-7">
                <div className="text-xs font-mono text-brand">{s.n}</div>
                <s.icon className="mt-4 h-6 w-6 text-foreground" />
                <h3 className="mt-4 text-lg font-semibold text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-28 border-t border-white/5">
        {/* placeholder for layout */}
        <div className="max-w-6xl mx-auto px-6">
          <SectionLabel>Features</SectionLabel>
          <h2 className="mt-3 text-4xl md:text-5xl font-semibold tracking-tight text-foreground max-w-3xl">
            Built for the hires that actually matter.
          </h2>
          <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Target, title: "AI scoring", desc: "Skills, experience and education weighted to your specific role." },
              { icon: Filter, title: "Smart filters", desc: "Slice by score, location, years of experience, or required skills." },
              { icon: Sparkles, title: "Explainable insights", desc: "Strengths, gaps and matched-skill counts for every candidate." },
              { icon: BarChart3, title: "Top 5 shortlist", desc: "Auto-highlighted standouts the moment scoring completes." },
              { icon: ShieldCheck, title: "Resume quality score", desc: "Spot weak or incomplete resumes before they cost you a slot." },
              { icon: Zap, title: "Bulk actions", desc: "Shortlist, reject or tag dozens of candidates in a single click." },
            ].map((f) => (
              <div key={f.title} className="group rounded-2xl border border-white/10 bg-card p-6 hover:border-brand/40 transition-colors">
                <div className="size-10 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-base font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-6">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-brand/15 via-card to-brand-2/10 p-10 md:p-16 text-center">
            <div className="absolute -top-24 -right-24 size-72 rounded-full bg-brand/30 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 size-72 rounded-full bg-brand-2/30 blur-3xl" />
            <div className="relative">
              <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
                Ready to skip the resume pile?
              </h2>
              <p className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto">
                Try SmartHire free — your first job and 100 resumes are on us.
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
                <Link to="/auth">
                  <Button size="lg" className="rounded-xl bg-white text-background hover:bg-white/90 px-8">
                    Start Free Trial
                  </Button>
                </Link>
                <Link to="/demo">
                  <Button size="lg" variant="outline" className="rounded-xl border-white/15 bg-white/5 text-foreground hover:bg-white/10 px-8">
                    See Demo
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded bg-gradient-to-br from-brand to-brand-2" />
            <span className="font-medium text-foreground">SmartHire</span>
          </div>
          <p>© {new Date().getFullYear()} SmartHire. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
};

function SectionLabel({ children, center = false }: { children: React.ReactNode; center?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${center ? "justify-center" : ""}`}>
      <span className="size-1.5 rounded-full bg-brand" />
      <span className="text-xs font-bold tracking-[0.2em] uppercase text-brand">{children}</span>
    </div>
  );
}

function Card({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-card p-7">
      <div className="size-10 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">{icon}</div>
      <h3 className="mt-5 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

function HeroMockup() {
  return (
    <div className="relative">
      <div className="relative z-20 rounded-2xl border border-white/10 bg-card/70 backdrop-blur-xl p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] -rotate-1 hover:rotate-0 transition-transform duration-500">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-full bg-gradient-to-br from-brand to-brand-2 flex items-center justify-center text-white font-semibold">JT</div>
            <div>
              <h3 className="text-foreground font-medium leading-tight">Julian Thorne</h3>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Sr. Frontend Developer</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold text-foreground tabular-nums">96<span className="text-sm text-muted-foreground">%</span></div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-brand">Match Score</div>
          </div>
        </div>
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-brand to-brand-2" style={{ width: "96%" }} />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {["React","TypeScript","Next.js","Tailwind","GraphQL","A11y"].map((s) => (
            <span key={s} className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[11px] text-foreground/80">{s}</span>
          ))}
        </div>
        <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-3 gap-3 text-xs">
          <div><div className="text-muted-foreground">Skills matched</div><div className="text-foreground font-semibold mt-1">7 / 8</div></div>
          <div><div className="text-muted-foreground">Experience</div><div className="text-foreground font-semibold mt-1">7 yrs</div></div>
          <div><div className="text-muted-foreground">Resume quality</div><div className="text-foreground font-semibold mt-1">94</div></div>
        </div>
      </div>

      <div className="absolute -bottom-8 -left-6 z-30 rounded-xl border border-brand/30 bg-card/90 backdrop-blur-xl p-4 w-56 shadow-[var(--shadow-brand)]">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Processing</div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-mono text-foreground tabular-nums">2.4s</span>
          <span className="text-xs text-emerald-400">−70%</span>
        </div>
        <div className="mt-3 flex items-end gap-1 h-8">
          {[40, 60, 35, 90, 55, 70, 45].map((h, i) => (
            <div key={i} className="flex-1 bg-brand/40 rounded-sm" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>

      <div className="absolute top-10 -right-4 -z-10 rounded-2xl border border-white/10 bg-card/40 p-5 w-72 opacity-50">
        <div className="h-3 w-32 bg-white/10 rounded mb-3" />
        <div className="h-2 w-44 bg-white/5 rounded" />
      </div>
    </div>
  );
}

function ScoreBreakdownMockup() {
  const rows = [
    { label: "Required skills", value: "7 / 8", pct: 88 },
    { label: "Experience", value: "7 yrs vs 4 req.", pct: 100 },
    { label: "Resume quality", value: "94 / 100", pct: 94 },
    { label: "Nice-to-have skills", value: "2 / 3", pct: 66 },
  ];
  return (
    <div className="rounded-2xl border border-white/10 bg-card p-7">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-foreground font-semibold">Why this score?</h4>
          <p className="text-xs text-muted-foreground mt-1">Julian Thorne · Sr. Frontend Developer</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-semibold text-foreground tabular-nums">96</div>
          <div className="text-[10px] uppercase tracking-widest text-brand font-bold">Overall</div>
        </div>
      </div>
      <div className="mt-6 space-y-4">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{r.label}</span>
              <span className="text-foreground font-medium">{r.value}</span>
            </div>
            <div className="mt-2 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-brand to-brand-2" style={{ width: `${r.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Index;
