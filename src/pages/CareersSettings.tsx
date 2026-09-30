const PUBLIC_ORIGIN = "https://talenval.lovable.app";
import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Copy, ExternalLink, Globe, Code2, Rocket } from "lucide-react";

interface PageRow {
  slug: string;
  company_name: string;
  tagline: string | null;
  about: string | null;
  brand_color: string;
  location: string | null;
  website: string | null;
  is_published: boolean;
}

const EMPTY: PageRow = {
  slug: "",
  company_name: "",
  tagline: "",
  about: "",
  brand_color: "#0ea5e9",
  location: "",
  website: "",
  is_published: true,
};

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);

export default function CareersSettings() {
  const navigate = useNavigate();
  const [row, setRow] = useState<PageRow>(EMPTY);
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applications, setApplications] = useState(0);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(PUBLIC_ORIGIN);
    document.title = "Careers page — Talenval";
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { navigate("/auth", { replace: true }); return; }
      const [{ data: page }, { data: profile }, { count }] = await Promise.all([
        supabase.from("careers_pages").select("*").eq("user_id", userData.user.id).maybeSingle(),
        supabase.from("profiles").select("company_name").eq("id", userData.user.id).maybeSingle(),
        supabase.from("job_applications").select("*", { count: "exact", head: true }),
      ]);
      setApplications(count ?? 0);
      if (page) {
        setExists(true);
        setRow(page as unknown as PageRow);
      } else {
        const company = profile?.company_name ?? "";
        setRow({ ...EMPTY, company_name: company, slug: slugify(company) });
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    const slug = slugify(row.slug || row.company_name);
    if (slug.length < 3) { toast.error("Pick a page address with at least 3 letters."); return; }
    if (!row.company_name.trim()) { toast.error("Add your company name."); return; }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const payload = { ...row, slug, user_id: userData.user!.id };
    const { error } = await supabase.from("careers_pages").upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "That page address is already taken." : error.message);
      return;
    }
    setRow({ ...row, slug });
    setExists(true);
    toast.success("Careers page saved.");
  };

  const publicUrl = `${origin}/careers/${row.slug}`;
  const snippet = `<div id="talenval-careers"></div>
<script src="${origin}/talenval-jobs.js" data-company="${row.slug}" defer></script>`;

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  if (loading) return <div className="min-h-screen bg-background"><AppHeader /><p className="container mx-auto py-8 text-muted-foreground">Loading…</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto max-w-3xl space-y-6 py-8">
        <div className="rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-accent/10 p-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            <Globe className="h-3.5 w-3.5" /> Careers portal
          </span>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Your branded careers page</h1>
          <p className="mt-1 text-muted-foreground">
            A public page listing every open role. Applicants apply in one click, land straight in your
            pipeline, and get screened automatically. {applications > 0 && `${applications} applications received so far.`}
          </p>
        </div>

        <Card>
          <CardHeader><h2 className="font-semibold">Page details</h2></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="company">Company name</Label>
              <Input id="company" value={row.company_name} onChange={(e) => setRow({ ...row, company_name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="slug">Page address</Label>
              <div className="flex items-center gap-2">
                <span className="whitespace-nowrap text-sm text-muted-foreground">{origin}/careers/</span>
                <Input id="slug" value={row.slug} onChange={(e) => setRow({ ...row, slug: e.target.value })} placeholder="your-company" />
              </div>
            </div>
            <div>
              <Label htmlFor="tagline">Tagline</Label>
              <Input id="tagline" value={row.tagline ?? ""} onChange={(e) => setRow({ ...row, tagline: e.target.value })} placeholder="Building the future of energy logistics" />
            </div>
            <div>
              <Label htmlFor="about">About your company</Label>
              <Textarea id="about" rows={4} value={row.about ?? ""} onChange={(e) => setRow({ ...row, about: e.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="loc">Location</Label>
                <Input id="loc" value={row.location ?? ""} onChange={(e) => setRow({ ...row, location: e.target.value })} placeholder="Lagos, Nigeria · Remote" />
              </div>
              <div>
                <Label htmlFor="web">Website</Label>
                <Input id="web" value={row.website ?? ""} onChange={(e) => setRow({ ...row, website: e.target.value })} placeholder="https://example.com" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <Label htmlFor="brand">Brand colour</Label>
                <Input id="brand" type="color" className="h-10 w-20 p-1" value={row.brand_color} onChange={(e) => setRow({ ...row, brand_color: e.target.value })} />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Switch id="pub" checked={row.is_published} onCheckedChange={(v) => setRow({ ...row, is_published: v })} />
                <Label htmlFor="pub">Page is live</Label>
              </div>
            </div>
            <Button className="gap-2" onClick={save} disabled={saving}>
              <Rocket className="h-4 w-4" /> {saving ? "Saving…" : exists ? "Save changes" : "Publish careers page"}
            </Button>
          </CardContent>
        </Card>

        {exists && row.slug && (
          <>
            <Card>
              <CardHeader><h2 className="font-semibold">Share your page</h2></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input readOnly value={publicUrl} />
                  <Button variant="outline" size="icon" onClick={() => copy(publicUrl, "Link")} aria-label="Copy link">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" asChild aria-label="Open page">
                    <a href={publicUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="flex items-center gap-2 font-semibold"><Code2 className="h-4 w-4" /> Embed on your own website</h2>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Paste this where you want your jobs to appear. It updates automatically as you post roles.
                </p>
                <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">{snippet}</pre>
                <Button variant="outline" className="gap-2" onClick={() => copy(snippet, "Embed code")}>
                  <Copy className="h-4 w-4" /> Copy embed code
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
