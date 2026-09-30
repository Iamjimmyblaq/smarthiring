import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Briefcase, CheckCircle2, Globe, MapPin, Search, Upload } from "lucide-react";

interface PublicJob {
  id: string;
  title: string;
  description: string;
  requirements: string;
  required_skills: string[] | null;
  min_years_experience: number | null;
  created_at: string;
}

interface CareersPayload {
  error?: string;
  page?: {
    slug: string; company_name: string; tagline: string | null; about: string | null;
    brand_color: string; location: string | null; website: string | null;
  };
  jobs?: PublicJob[];
}

export default function Careers() {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const embed = params.get("embed") === "1";
  const [data, setData] = useState<CareersPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [applyTo, setApplyTo] = useState<PublicJob | null>(null);

  useEffect(() => {
    (async () => {
      const { data: res } = await supabase.rpc("get_public_careers", { _slug: slug ?? "" });
      const payload = res as unknown as CareersPayload;
      setData(payload);
      setLoading(false);
      if (payload?.page) document.title = `Careers at ${payload.page.company_name}`;
    })();
  }, [slug]);

  const jobs = useMemo(() => {
    const list = data?.jobs ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((j) =>
      [j.title, j.description, ...(j.required_skills ?? [])].join(" ").toLowerCase().includes(q),
    );
  }, [data, query]);

  if (loading) return <div className="p-10 text-center text-muted-foreground">Loading open roles…</div>;

  if (!data?.page) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 text-center">
        <div>
          <p className="text-lg font-medium">This careers page isn't available</p>
          <p className="text-muted-foreground">The link may be wrong, or the page is unpublished.</p>
        </div>
      </div>
    );
  }

  const page = data.page;

  return (
    <div className="min-h-screen bg-background">
      {!embed && (
        <header
          className="border-b"
          style={{ background: `linear-gradient(135deg, ${page.brand_color}22, transparent)` }}
        >
          <div className="container mx-auto py-12">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: page.brand_color }}>
              Careers
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">{page.company_name}</h1>
            {page.tagline && <p className="mt-2 max-w-2xl text-lg text-muted-foreground">{page.tagline}</p>}
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
              {page.location && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{page.location}</span>}
              {page.website && (
                <a href={page.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:underline">
                  <Globe className="h-4 w-4" />{page.website.replace(/^https?:\/\//, "")}
                </a>
              )}
              <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4" />{(data.jobs ?? []).length} open roles</span>
            </div>
          </div>
        </header>
      )}

      <main className="container mx-auto py-8">
        {page.about && !embed && (
          <p className="mb-8 max-w-3xl whitespace-pre-line leading-relaxed text-muted-foreground">{page.about}</p>
        )}

        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search roles or skills"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search roles"
          />
        </div>

        {jobs.length === 0 ? (
          <Card className="py-14 text-center">
            <CardContent>
              <p className="font-medium">No open roles right now</p>
              <p className="text-muted-foreground">Check back soon.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {jobs.map((j) => (
              <Card key={j.id} className="transition-shadow hover:shadow-md">
                <CardContent className="space-y-3 p-5">
                  <h2 className="text-lg font-semibold">{j.title}</h2>
                  <p className="line-clamp-3 text-sm text-muted-foreground">{j.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(j.required_skills ?? []).slice(0, 6).map((s) => (
                      <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                  <Button className="w-full" style={{ backgroundColor: page.brand_color }} onClick={() => setApplyTo(j)}>
                    Apply in one click
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <p className="mt-10 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          Powered by <Logo size={16} wordmarkClassName="text-muted-foreground" />
        </p>
      </main>

      <ApplyDialog job={applyTo} slug={slug ?? ""} onClose={() => setApplyTo(null)} brand={page.brand_color} />
    </div>
  );
}

function ApplyDialog({ job, slug, onClose, brand }: { job: PublicJob | null; slug: string; onClose: () => void; brand: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => { if (job) { setDone(false); } }, [job]);

  const readFile = async (file: File) => {
    setFileName(file.name);
    if (file.type === "application/pdf") {
      const { extractResumeText } = await import("@/lib/resume-parser");
      try {
        const text = await extractResumeText(file);
        setResumeText(text);
        return;
      } catch { /* fall through to plain read */ }
    }
    setResumeText(await file.text());
  };

  const submit = async () => {
    if (!job) return;
    setSending(true);
    const { data, error } = await supabase.rpc("submit_job_application", {
      _slug: slug,
      _job_id: job.id,
      _full_name: name,
      _email: email,
      _phone: phone,
      _resume_text: resumeText,
      _cover_note: note,
    });
    setSending(false);
    const payload = data as unknown as { ok?: boolean; error?: string };
    if (error || payload?.error) {
      const msg = payload?.error === "duplicate"
        ? "You've already applied to this role."
        : payload?.error === "job_closed"
          ? "This role has just closed."
          : "Your application couldn't be sent. Please try again.";
      toast.error(msg);
      return;
    }
    setDone(true);
  };

  return (
    <Dialog open={Boolean(job)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{done ? "Application received" : `Apply — ${job?.title ?? ""}`}</DialogTitle>
        </DialogHeader>
        {done ? (
          <div className="space-y-3 py-4 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <p className="font-medium">Thanks, {name.split(" ")[0] || "there"}!</p>
            <p className="text-sm text-muted-foreground">
              Your application is in. If there's a next step, you'll get an email with your assessment or
              interview link shortly.
            </p>
            <Button className="w-full" onClick={onClose}>Close</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Full name" />
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
            <Input placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Phone" />
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground hover:bg-muted/40">
              <Upload className="h-4 w-4" />
              {fileName || "Attach your resume (PDF or text)"}
              <input
                type="file"
                className="sr-only"
                accept=".pdf,.txt,.md,.doc,.docx"
                onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])}
              />
            </label>
            <Textarea rows={3} placeholder="Why you're a fit (optional)" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Cover note" />
            <Button
              className="w-full"
              style={{ backgroundColor: brand }}
              disabled={sending || !name.trim() || !email.trim()}
              onClick={submit}
            >
              {sending ? "Sending…" : "Submit application"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
