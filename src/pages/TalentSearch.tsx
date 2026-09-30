import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@/lib/router-compat";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Search, Sparkles, Share2, Loader2 } from "lucide-react";
import { searchCandidates, SEARCH_EXAMPLES, type SearchableCandidate } from "@/lib/talent-search";
import ShareDossierDialog from "@/components/ShareDossierDialog";
import { useBlindMode } from "@/hooks/useBlindMode";
import { maskName } from "@/lib/blind";
import { STAGES } from "@/lib/lifecycle";

export default function TalentSearch() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<SearchableCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const { blind } = useBlindMode();
  const [shareFor, setShareFor] = useState<SearchableCandidate | null>(null);

  useEffect(() => {
    document.title = "Talent search — Talenval";
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { navigate("/auth", { replace: true }); return; }
      supabase
        .from("candidates")
        .select("id,name,email,stage,overall_score,skills_score,experience_score,years_experience,matched_skills,missing_skills,strengths,summary,resume_text,created_at,job_id,jobs(title)")
        .order("created_at", { ascending: false })
        .then(({ data: d }) => {
          setRows((d ?? []) as unknown as SearchableCandidate[]);
          setLoading(false);
        });
    });
  }, [navigate]);

  const hits = useMemo(() => (submitted.trim() ? searchCandidates(rows, submitted) : []), [rows, submitted]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <Badge variant="outline" className="gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Ask Talenval</Badge>
          <h1 className="text-3xl md:text-4xl font-semibold mt-4">Search every candidate you've ever evaluated.</h1>
          <p className="text-muted-foreground mt-2">
            Ask in plain English. Talenval searches scorecards, resumes, skills and stages across your whole
            history — so the person you rejected last quarter isn't lost.
          </p>
          <form
            className="flex gap-2 mt-6"
            onSubmit={(e) => { e.preventDefault(); setSubmitted(query); }}
          >
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. 4+ years mud engineers who scored over 70"
              aria-label="Search your candidates"
            />
            <Button type="submit" className="gap-2"><Search className="h-4 w-4" /> Search</Button>
          </form>
          <div className="flex flex-wrap justify-center gap-2 mt-3">
            {SEARCH_EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                className="text-xs rounded-full border px-3 py-1 text-muted-foreground hover:bg-muted"
                onClick={() => { setQuery(ex); setSubmitted(ex); }}
              >
                {ex}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {loading ? "Loading your talent pool…" : `${rows.length.toLocaleString("en-US")} candidates in your pool`}
          </p>
        </div>

        <div className="max-w-3xl mx-auto mt-10 space-y-3">
          {loading && <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />}
          {!loading && submitted && hits.length === 0 && (
            <p className="text-center text-muted-foreground py-10">
              No one in your pool matches that yet. Try fewer conditions or different skills.
            </p>
          )}
          {hits.map(({ candidate: c, reasons }) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/jobs/${c.job_id}`} className="font-medium hover:underline">
                      {maskName(c.id, c.name, blind)}
                    </Link>
                    <p className="text-sm text-muted-foreground truncate">{c.jobs?.title ?? "—"}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {c.overall_score != null && <Badge variant="outline">{c.overall_score}</Badge>}
                    <Badge variant="secondary">{STAGES.find((s) => s.key === c.stage)?.label ?? c.stage}</Badge>
                    <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Share with a hiring manager" onClick={() => setShareFor(c)}>
                      <Share2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {reasons.map((r) => (
                    <span key={r} className="text-xs rounded-full bg-accent/10 text-accent-foreground border border-accent/30 px-2 py-0.5">
                      {r}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      <ShareDossierDialog
        candidateId={shareFor?.id ?? null}
        candidateName={shareFor ? maskName(shareFor.id, shareFor.name, blind) : ""}
        jobTitle={shareFor?.jobs?.title}
        onClose={() => setShareFor(null)}
      />
    </div>
  );
}
