import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import CandidateNameOverride from "@/components/admin/CandidateNameOverride";
import { ArrowLeft, Ban, Loader2, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";

const fmt = (v: string | null) => (v ? new Date(v).toLocaleString() : "—");

export default function AdminUserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sharedIpUsers, setSharedIpUsers] = useState<any[]>([]);
  const [blocked, setBlocked] = useState(false);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [p, pl, r, tm, j, c, s] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
      supabase.from("user_plans").select("*").eq("user_id", id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", id),
      supabase.from("team_members").select("*, teams(name)").eq("user_id", id),
      supabase.from("jobs").select("id, title, status, created_at").eq("user_id", id).order("created_at", { ascending: false }),
      supabase.from("candidates").select("id, name, email, overall_score, processing_status, stage, created_at, name_overridden_at, job_id")
        .eq("user_id", id).order("created_at", { ascending: false }).limit(200),
      supabase.from("interview_sessions").select("id, status, recommendation, created_at").eq("user_id", id)
        .order("created_at", { ascending: false }).limit(50),
    ]);
    setProfile(p.data);
    setPlan(pl.data);
    setRoles(((r.data ?? []) as { role: string }[]).map((x) => x.role));
    setMemberships(tm.data ?? []);
    setJobs(j.data ?? []);
    setCandidates(c.data ?? []);
    setSessions(s.data ?? []);

    const ip = p.data?.signup_ip ?? p.data?.last_ip ?? null;
    if (ip) {
      const [{ data: shared }, { data: b }] = await Promise.all([
        supabase.from("profiles").select("id, email, created_at").or(`signup_ip.eq.${ip},last_ip.eq.${ip}`).neq("id", id),
        supabase.from("blocked_ips").select("ip").eq("ip", ip).maybeSingle(),
      ]);
      setSharedIpUsers(shared ?? []);
      setBlocked(Boolean(b));
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    document.title = "User details — SmartHire admin";
    if (!roleLoading && isAdmin) load();
    else if (!roleLoading) setLoading(false);
  }, [roleLoading, isAdmin, load]);

  const ip = profile?.signup_ip ?? profile?.last_ip ?? null;

  const toggleBlockIp = async () => {
    if (!ip) return;
    setWorking(true);
    if (blocked) {
      const { error } = await supabase.from("blocked_ips").delete().eq("ip", ip);
      if (error) toast.error(error.message);
      else { setBlocked(false); toast.success(`${ip} unblocked`); }
    } else {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("blocked_ips").insert({
        ip, reason: "Repeat free-trial signups", blocked_by: u.user?.id ?? null,
      });
      if (error) toast.error(error.message);
      else { setBlocked(true); toast.success(`${ip} blocked`); }
    }
    setWorking(false);
  };

  const deleteAccount = async () => {
    setWorking(true);
    const { data, error } = await supabase.functions.invoke("admin-delete-user", { body: { user_id: id } });
    setWorking(false);
    if (error || (data as { error?: string })?.error) {
      return toast.error((data as { error?: string })?.error || "Could not delete this account");
    }
    toast.success("Account deleted");
    navigate("/admin", { replace: true });
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container mx-auto py-20 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto py-20 text-center">
          <h1 className="text-2xl font-semibold">Admin access required</h1>
        </main>
      </div>
    );
  }

  const scanned = candidates.length;
  const failed = candidates.filter((c) => c.processing_status === "error").length;
  const hired = candidates.filter((c) => c.stage === "hired").length;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto py-8 max-w-5xl space-y-6">
        <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to admin console
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{profile?.full_name || profile?.email || "Unknown user"}</h1>
            <p className="text-muted-foreground mt-1">{profile?.email} · joined {fmt(profile?.created_at)}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant={plan?.plan && plan.plan !== "free" ? "default" : "outline"}>{plan?.plan ?? "free"}</Badge>
              {roles.map((r) => <Badge key={r} variant="outline">{r.replace("_", " ")}</Badge>)}
              {blocked && <Badge className="bg-destructive text-destructive-foreground">IP blocked</Badge>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={toggleBlockIp} disabled={!ip || working}>
              <Ban className="h-4 w-4" /> {blocked ? "Unblock IP" : "Block IP"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2" disabled={working}>
                  <Trash2 className="h-4 w-4" /> Delete account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this account permanently?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the user's login, profile, jobs, candidates and interview data. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteAccount}>Delete account</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Jobs created", value: jobs.length },
            { label: "Resumes scanned", value: scanned },
            { label: "AI interviews", value: sessions.length },
            { label: "Hired", value: hired },
          ].map((s) => (
            <Card key={s.label}><CardContent className="pt-6">
              <p className="text-2xl font-semibold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent></Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Subscription</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <p>Plan: <strong>{plan?.plan ?? "free"}</strong></p>
              <p>Renews / ends: {fmt(plan?.current_period_end ?? null)}</p>
              <p className="text-muted-foreground">Company: {profile?.company_name || "—"}</p>
              <p className="text-muted-foreground">HR email: {profile?.hr_email || "—"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Engagement &amp; IP</CardTitle>
              <CardDescription>Used to detect duplicate free-trial accounts.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p>Last active: {fmt(profile?.last_active_at ?? null)}</p>
              <p>Location: {profile?.location || "—"}</p>
              <p>Signup IP: <span className="font-mono text-xs">{profile?.signup_ip || "—"}</span></p>
              <p>Last IP: <span className="font-mono text-xs">{profile?.last_ip || "—"}</span></p>
              <p className={sharedIpUsers.length ? "text-destructive" : "text-muted-foreground"}>
                {sharedIpUsers.length
                  ? `${sharedIpUsers.length} other account(s) share this IP`
                  : "No other accounts on this IP"}
              </p>
              {sharedIpUsers.slice(0, 5).map((u) => (
                <p key={u.id} className="text-xs">
                  <Link className="underline" to={`/admin/users/${u.id}`}>{u.email || u.id}</Link>
                </p>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Team &amp; role memberships</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {memberships.length === 0 && <p className="text-muted-foreground">Not a member of any team.</p>}
            {memberships.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border p-3">
                <span>{m.teams?.name ?? "Team"}</span>
                <Badge variant="outline">{String(m.role).replace("_", " ")}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scan history</CardTitle>
            <CardDescription>{scanned} resumes · {failed} failed to parse. Admins can correct extracted names.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr className="text-left">
                  <th className="p-3 font-medium">Candidate</th>
                  <th className="p-3 font-medium">Stage</th>
                  <th className="p-3 font-medium">Parse</th>
                  <th className="p-3 font-medium text-right">Score</th>
                  <th className="p-3 font-medium">Scanned</th>
                  <th className="p-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {candidates.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No resumes scanned yet.</td></tr>
                )}
                {candidates.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-3">
                      <p className="font-medium">{c.name || "Unnamed"}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.email || "—"}{c.name_overridden_at ? " · name corrected" : ""}
                      </p>
                    </td>
                    <td className="p-3 text-xs capitalize">{c.stage ?? "sourced"}</td>
                    <td className="p-3 text-xs">
                      <Badge variant={c.processing_status === "error" ? "destructive" : "outline"}>
                        {c.processing_status ?? "pending"}
                      </Badge>
                    </td>
                    <td className="p-3 text-right tabular-nums">{c.overall_score ?? "—"}</td>
                    <td className="p-3 text-xs">{fmt(c.created_at)}</td>
                    <td className="p-3 text-right">
                      <CandidateNameOverride
                        candidateId={c.id}
                        currentName={c.name}
                        onSaved={(name) => setCandidates((prev) => prev.map((x) => (x.id === c.id ? { ...x, name, name_overridden_at: new Date().toISOString() } : x)))}
                        compact
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}