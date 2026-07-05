import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MarketingNav from "@/components/marketing/MarketingNav";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_CANDIDATES, DEMO_JOB, type DemoCandidate } from "@/lib/demo-data";
import {
  Upload, Search, Filter, Star, CheckCircle2, XCircle, Sparkles,
  Briefcase, MapPin, Clock, FileText, ArrowRight, Loader2, Trophy,
} from "lucide-react";
import { toast } from "sonner";

export default function Demo() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    document.title = "Live Demo — SmartHire";
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      setAuthChecked(true);
    });
    document.documentElement.classList.add("theme-marketing");
    document.body.classList.add("theme-marketing");
    return () => {
      document.documentElement.classList.remove("theme-marketing");
      document.body.classList.remove("theme-marketing");
    };
  }, []);

  if (!authChecked) {
    return (
      <main className="theme-marketing min-h-screen flex items-center justify-center">
        <Helmet>
          <title>Live Demo — SmartHire</title>
          <meta name="description" content="Try SmartHire live: a Frontend Developer role prefilled with 10 sample candidates, ranked instantly with explainable AI scoring." />
          <link rel="canonical" href="https://smarthiring.lovable.app/demo" />
          <meta property="og:title" content="Live Demo — SmartHire" />
          <meta property="og:description" content="Try SmartHire live with a prefilled role and 10 sample candidates ranked instantly." />
          <meta property="og:url" content="https://smarthiring.lovable.app/demo" />
        </Helmet>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="theme-marketing min-h-screen">
        <Helmet>
          <title>Live Demo — SmartHire</title>
          <meta name="description" content="Try SmartHire live: a Frontend Developer role prefilled with 10 sample candidates, ranked instantly with explainable AI scoring." />
          <link rel="canonical" href="https://smarthiring.lovable.app/demo" />
          <meta property="og:title" content="Live Demo — SmartHire" />
          <meta property="og:description" content="Try SmartHire live with a prefilled role and 10 sample candidates ranked instantly." />
          <meta property="og:url" content="https://smarthiring.lovable.app/demo" />
        </Helmet>
        <MarketingNav />
        <section className="pt-40 pb-32">
          <div className="max-w-xl mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-xs font-bold tracking-widest uppercase mb-6">
              <Sparkles className="h-3 w-3" /> Live Demo
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
              Sign in to try the demo
            </h1>
            <p className="mt-5 text-muted-foreground">
              The interactive demo loads instantly with a Frontend Developer role and 10 sample candidates — no setup required.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Button onClick={() => navigate("/auth")} className="rounded-xl bg-brand text-white hover:bg-brand/90 shadow-[var(--shadow-brand)]">
                Sign in to continue <ArrowRight className="h-4 w-4" />
              </Button>
              <Link to="/"><Button variant="outline" className="rounded-xl border-white/15 bg-white/5 text-foreground hover:bg-white/10">Back to home</Button></Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return <DemoExperience />;
}

function DemoExperience() {
  const [query, setQuery] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [onlyShortlisted, setOnlyShortlisted] = useState(false);
  const [shortlist, setShortlist] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string>(DEMO_CANDIDATES[0].id);
  const [uploading, setUploading] = useState(false);

  const ranked = useMemo(
    () => [...DEMO_CANDIDATES].sort((a, b) => b.score - a.score),
    [],
  );
  const top5Ids = useMemo(() => new Set(ranked.slice(0, 5).map((c) => c.id)), [ranked]);

  const filtered = ranked.filter((c) => {
    if (c.score < minScore) return false;
    if (onlyShortlisted && !shortlist.has(c.id)) return false;
    if (query) {
      const q = query.toLowerCase();
      if (
        !c.name.toLowerCase().includes(q) &&
        !c.title.toLowerCase().includes(q) &&
        !c.skills.some((s) => s.toLowerCase().includes(q))
      ) return false;
    }
    return true;
  });

  const selected = DEMO_CANDIDATES.find((c) => c.id === selectedId)!;

  const toggleShortlist = (id: string) => {
    setShortlist((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const simulateUpload = () => {
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      toast.success("Demo: 12 resumes parsed and scored", {
        description: "In production, real resumes would now appear ranked below.",
      });
    }, 1600);
  };

  return (
    <main className="theme-marketing min-h-screen">
      <MarketingNav />

      <section className="pt-24 pb-12 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-xs font-bold tracking-widest uppercase mb-4">
              <Sparkles className="h-3 w-3" /> Live Demo · Sample Data
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">{DEMO_JOB.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Briefcase className="h-4 w-4" /> {DEMO_JOB.company}</span>
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {DEMO_JOB.location}</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" /> {DEMO_JOB.minYears}+ years required</span>
            </div>
          </div>
          <Button onClick={simulateUpload} disabled={uploading} className="rounded-xl bg-brand text-white hover:bg-brand/90 shadow-[var(--shadow-brand)]">
            {uploading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Parsing resumes…</>) : (<><Upload className="h-4 w-4" /> Upload resumes</>)}
          </Button>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-10 grid lg:grid-cols-12 gap-8">
        {/* SIDEBAR FILTERS */}
        <aside className="lg:col-span-3">
          <div className="rounded-2xl border border-white/10 bg-card p-5 space-y-6 sticky top-24">
            <div>
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <Filter className="h-4 w-4" /> Filters
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Search</label>
              <div className="mt-2 relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Name, title, skill"
                  className="pl-9 bg-background/40 border-white/10 text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Min score</span><span className="text-foreground tabular-nums">{minScore}</span>
              </label>
              <input
                type="range" min={0} max={100} value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="mt-3 w-full accent-brand"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-foreground/90 cursor-pointer">
              <input
                type="checkbox" checked={onlyShortlisted}
                onChange={(e) => setOnlyShortlisted(e.target.checked)}
                className="accent-brand size-4"
              />
              Shortlisted only ({shortlist.size})
            </label>

            <div className="pt-4 border-t border-white/10">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Required skills</div>
              <div className="flex flex-wrap gap-1.5">
                {DEMO_JOB.requiredSkills.map((s) => (
                  <Badge key={s} variant="outline" className="border-white/15 text-foreground/80 font-normal">{s}</Badge>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* RANKED LIST */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-foreground tracking-wide uppercase">
              {filtered.length} candidates
            </h2>
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 text-brand" /> Top 5 auto-highlighted
            </span>
          </div>
          {filtered.map((c, i) => (
            <CandidateRow
              key={c.id}
              candidate={c}
              rank={ranked.findIndex((r) => r.id === c.id) + 1}
              isTop5={top5Ids.has(c.id)}
              isSelected={c.id === selectedId}
              isShortlisted={shortlist.has(c.id)}
              onSelect={() => setSelectedId(c.id)}
              onToggleShortlist={() => toggleShortlist(c.id)}
            />
          ))}
          {filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-muted-foreground text-sm">
              No candidates match your filters.
            </div>
          )}
        </div>

        {/* DETAIL */}
        <div className="lg:col-span-4">
          <CandidateDetail candidate={selected} requiredSkills={DEMO_JOB.requiredSkills} minYears={DEMO_JOB.minYears} />
        </div>
      </section>
    </main>
  );
}

function scoreColor(score: number) {
  if (score >= 85) return "text-emerald-400";
  if (score >= 70) return "text-brand";
  if (score >= 55) return "text-amber-400";
  return "text-rose-400";
}

function CandidateRow({
  candidate, rank, isTop5, isSelected, isShortlisted, onSelect, onToggleShortlist,
}: {
  candidate: DemoCandidate; rank: number; isTop5: boolean; isSelected: boolean;
  isShortlisted: boolean; onSelect: () => void; onToggleShortlist: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-xl border bg-card p-4 transition-all ${
        isSelected ? "border-brand/60 shadow-[var(--shadow-brand)]" : "border-white/10 hover:border-white/20"
      }`}
    >
      <div className="flex items-center gap-4">
        <div className="text-xs font-mono text-muted-foreground w-6 tabular-nums">#{rank}</div>
        <div className="size-10 rounded-full bg-gradient-to-br from-brand to-brand-2 flex items-center justify-center text-white text-sm font-semibold shrink-0">
          {candidate.name.split(" ").map((n) => n[0]).join("")}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-foreground font-medium truncate">{candidate.name}</h3>
            {isTop5 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-brand/15 border border-brand/30 text-[10px] font-bold uppercase tracking-wider text-brand">
                <Trophy className="h-3 w-3" /> Top 5
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{candidate.title} · {candidate.yearsExperience} yrs</p>
        </div>
        <div className="text-right">
          <div className={`text-lg font-semibold tabular-nums ${scoreColor(candidate.score)}`}>{candidate.score}</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Match</div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleShortlist(); }}
          className={`shrink-0 size-8 rounded-md flex items-center justify-center border transition-colors ${
            isShortlisted ? "bg-brand/15 border-brand/40 text-brand" : "border-white/10 text-muted-foreground hover:text-foreground"
          }`}
          aria-label="Shortlist"
        >
          <Star className={`h-4 w-4 ${isShortlisted ? "fill-current" : ""}`} />
        </button>
      </div>
      <div className="mt-3 h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-brand to-brand-2" style={{ width: `${candidate.score}%` }} />
      </div>
    </button>
  );
}

function CandidateDetail({
  candidate, requiredSkills, minYears,
}: { candidate: DemoCandidate; requiredSkills: string[]; minYears: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-card p-6 sticky top-24">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-full bg-gradient-to-br from-brand to-brand-2 flex items-center justify-center text-white font-semibold">
            {candidate.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div>
            <h3 className="text-foreground font-semibold">{candidate.name}</h3>
            <p className="text-xs text-muted-foreground">{candidate.title} · {candidate.location}</p>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-semibold tabular-nums ${scoreColor(candidate.score)}`}>{candidate.score}</div>
          <div className="text-[10px] uppercase tracking-widest text-brand font-bold">Match</div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 text-xs">
        <Stat label="Skills matched" value={`${candidate.matchedSkills.length}/${requiredSkills.length}`} />
        <Stat label="Experience" value={`${candidate.yearsExperience} yrs`} sub={`vs ${minYears} req.`} />
        <Stat label="Resume quality" value={`${candidate.resumeQuality}`} />
      </div>

      <div className="mt-6">
        <SectionHeading>AI Summary</SectionHeading>
        <p className="mt-2 text-sm text-foreground/90 leading-relaxed">{candidate.summary}</p>
      </div>

      <div className="mt-6">
        <SectionHeading>Skills</SectionHeading>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {requiredSkills.map((s) => {
            const matched = candidate.matchedSkills.includes(s);
            return (
              <span
                key={s}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs border ${
                  matched
                    ? "bg-brand/10 border-brand/30 text-brand"
                    : "bg-white/5 border-white/10 text-muted-foreground line-through"
                }`}
              >
                {matched ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} {s}
              </span>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4">
        <div>
          <SectionHeading>Strengths</SectionHeading>
          <ul className="mt-2 space-y-1.5 text-sm text-foreground/90">
            {candidate.strengths.map((s) => (
              <li key={s} className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />{s}</li>
            ))}
          </ul>
        </div>
        <div>
          <SectionHeading>Gaps</SectionHeading>
          <ul className="mt-2 space-y-1.5 text-sm text-foreground/90">
            {candidate.gaps.map((s) => (
              <li key={s} className="flex gap-2"><XCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />{s}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-white/10">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground inline-flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Resume quality</span>
          <span className="text-foreground tabular-nums">{candidate.resumeQuality}/100</span>
        </div>
        <Progress value={candidate.resumeQuality} className="mt-2 h-1.5" />
      </div>

      <div className="mt-6 flex gap-2">
        <Button className="flex-1 bg-brand text-white hover:bg-brand/90">Shortlist</Button>
        <Button variant="outline" className="border-white/15 bg-transparent text-foreground hover:bg-white/5">Reject</Button>
      </div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{children}</div>;
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-background/40 p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 text-foreground font-semibold">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}