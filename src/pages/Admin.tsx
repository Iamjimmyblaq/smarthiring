import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { useIsAdmin, type AppRole } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Download, Loader2, Plus, Save, ShieldCheck, Trash2, Users } from "lucide-react";

interface Tier {
  id: string;
  key: string;
  name: string;
  description: string | null;
  price_amount: number;
  currency: string;
  billing_period: string;
  max_jobs: number | null;
  max_resumes: number | null;
  max_ai_interviews: number | null;
  features: string[];
  is_active: boolean;
  sort_order: number;
}

const ROLES: AppRole[] = ["member", "recruiter", "admin", "super_admin"];

const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));
const limitText = (v: number | null) => (v === null ? "" : String(v));

interface UserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  company_name: string | null;
  location: string | null;
  last_active_at: string | null;
  created_at: string | null;
  plan: string;
  jobs: number;
  resumes: number;
  aiInterviews: number;
  roles: string[];
}

const fmtDate = (v: string | null) =>
  v ? new Date(v).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";

export default function Admin() {
  const navigate = useNavigate();
  const { isAdmin, isSuperAdmin, loading: roleLoading } = useIsAdmin();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [roleRows, setRoleRows] = useState<any[]>([]);
  const [planRows, setPlanRows] = useState<any[]>([]);
  const [jobRows, setJobRows] = useState<any[]>([]);
  const [candidateRows, setCandidateRows] = useState<any[]>([]);
  const [sessionRows, setSessionRows] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [teamOpen, setTeamOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamDesc, setTeamDesc] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<AppRole>("member");
  const [memberTeam, setMemberTeam] = useState<string>("");

  useEffect(() => {
    document.title = "Admin console — SmartHire";
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate("/auth", { replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    if (roleLoading) return;
    if (!isAdmin) { setLoading(false); return; }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleLoading, isAdmin]);

  const load = async () => {
    setLoading(true);
    const [t, tm, mem, prof, roles, plans, jobs, cands, sessions] = await Promise.all([
      supabase.from("plan_tiers").select("*").order("sort_order"),
      supabase.from("teams").select("*").order("created_at", { ascending: false }),
      supabase.from("team_members").select("*").order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, email, full_name, company_name, location, last_active_at, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("user_roles").select("*"),
      supabase.from("user_plans").select("user_id, plan, current_period_end"),
      supabase.from("jobs").select("user_id"),
      supabase.from("candidates").select("user_id"),
      supabase.from("interview_sessions").select("user_id"),
    ]);
    setTiers(((t.data ?? []) as any[]).map((x) => ({ ...x, features: x.features ?? [] })) as Tier[]);
    setTeams(tm.data ?? []);
    setMembers(mem.data ?? []);
    setProfiles(prof.data ?? []);
    setRoleRows(roles.data ?? []);
    setPlanRows(plans.data ?? []);
    setJobRows(jobs.data ?? []);
    setCandidateRows(cands.data ?? []);
    setSessionRows(sessions.data ?? []);
    setLoading(false);
  };

  const patchTier = (id: string, patch: Partial<Tier>) =>
    setTiers((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const saveTier = async (tier: Tier) => {
    setSaving(tier.id);
    const { error } = await supabase.from("plan_tiers").update({
      name: tier.name,
      description: tier.description,
      price_amount: Number(tier.price_amount) || 0,
      currency: tier.currency,
      billing_period: tier.billing_period,
      max_jobs: tier.max_jobs,
      max_resumes: tier.max_resumes,
      max_ai_interviews: tier.max_ai_interviews,
      features: tier.features,
      is_active: tier.is_active,
      sort_order: tier.sort_order,
    }).eq("id", tier.id);
    setSaving(null);
    if (error) return toast.error(error.message);
    toast.success(`${tier.name} updated`);
  };

  const addTier = async () => {
    const key = `tier_${Date.now().toString(36)}`;
    const { error } = await supabase.from("plan_tiers").insert({
      key, name: "New tier", price_amount: 0, sort_order: tiers.length + 1,
    });
    if (error) return toast.error(error.message);
    toast.success("Tier created");
    load();
  };

  const deleteTier = async (id: string) => {
    const { error } = await supabase.from("plan_tiers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setTiers((prev) => prev.filter((t) => t.id !== id));
  };

  const createTeam = async () => {
    if (!teamName.trim()) return toast.error("Team name required");
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("teams").insert({
      name: teamName.trim(), description: teamDesc.trim() || null, owner_id: userData.user?.id ?? null,
    });
    if (error) return toast.error(error.message);
    setTeamName(""); setTeamDesc(""); setTeamOpen(false);
    toast.success("Team created");
    load();
  };

  const addMember = async () => {
    const email = memberEmail.trim().toLowerCase();
    if (!email || !memberTeam) return toast.error("Pick a team and enter an email");
    const match = profiles.find((p) => (p.email ?? "").toLowerCase() === email);
    const { error } = await supabase.from("team_members").insert({
      team_id: memberTeam, email, role: memberRole, user_id: match?.id ?? null,
    });
    if (error) return toast.error(error.message);
    if (match) {
      await supabase.from("user_roles").upsert({ user_id: match.id, role: memberRole }, { onConflict: "user_id,role" });
    }
    setMemberEmail("");
    toast.success(match ? "Member added and role assigned" : "Member added — role applies once they sign up");
    load();
  };

  const changeMemberRole = async (member: any, role: AppRole) => {
    const { error } = await supabase.from("team_members").update({ role }).eq("id", member.id);
    if (error) return toast.error(error.message);
    if (member.user_id) {
      await supabase.from("user_roles").delete().eq("user_id", member.user_id).neq("role", "super_admin");
      await supabase.from("user_roles").upsert({ user_id: member.user_id, role }, { onConflict: "user_id,role" });
    }
    toast.success("Role updated");
    load();
  };

  const removeMember = async (id: string) => {
    const { error } = await supabase.from("team_members").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const rolesByUser = useMemo(() => {
    const map: Record<string, string[]> = {};
    roleRows.forEach((r) => { (map[r.user_id] ||= []).push(r.role); });
    return map;
  }, [roleRows]);

  const countBy = (rows: any[]) => {
    const map: Record<string, number> = {};
    rows.forEach((r) => { map[r.user_id] = (map[r.user_id] ?? 0) + 1; });
    return map;
  };

  const users: UserRow[] = useMemo(() => {
    const plans = Object.fromEntries(planRows.map((p) => [p.user_id, p.plan]));
    const jobs = countBy(jobRows);
    const resumes = countBy(candidateRows);
    const sessions = countBy(sessionRows);
    return profiles.map((p) => ({
      id: p.id,
      email: p.email ?? null,
      full_name: p.full_name ?? null,
      company_name: p.company_name ?? null,
      location: p.location ?? null,
      last_active_at: p.last_active_at ?? null,
      created_at: p.created_at ?? null,
      plan: plans[p.id] ?? "free",
      jobs: jobs[p.id] ?? 0,
      resumes: resumes[p.id] ?? 0,
      aiInterviews: sessions[p.id] ?? 0,
      roles: rolesByUser[p.id] ?? [],
    }));
  }, [profiles, planRows, jobRows, candidateRows, sessionRows, rolesByUser]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.email, u.full_name, u.company_name, u.location, u.plan].some((v) => (v ?? "").toLowerCase().includes(q)),
    );
  }, [users, userSearch]);

  const exportUsers = () => {
    const header = ["Name", "Email", "Company", "Plan", "Roles", "Jobs", "Resumes scanned", "AI interviews", "Location", "Joined", "Last active"];
    const rows = filteredUsers.map((u) => [
      u.full_name ?? "", u.email ?? "", u.company_name ?? "", u.plan, u.roles.join(" "),
      u.jobs, u.resumes, u.aiInterviews, u.location ?? "", fmtDate(u.created_at), fmtDate(u.last_active_at),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `smarthire-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
        <main className="container mx-auto py-20 max-w-lg text-center">
          <h1 className="text-2xl font-semibold">Admin access required</h1>
          <p className="text-muted-foreground mt-3">This console is restricted to SmartHire administrators.</p>
          <Button className="mt-6" onClick={() => navigate("/jobs")}>Back to app</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto py-8 max-w-6xl space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-7 w-7" aria-hidden="true" /> Admin console
            </h1>
            <p className="text-muted-foreground mt-1">Manage subscription tiers, teams and roles.</p>
          </div>
          {isSuperAdmin && <Badge className="bg-emerald-600 text-white">Super admin</Badge>}
        </div>

        <Tabs defaultValue="plans">
          <TabsList>
            <TabsTrigger value="plans">Subscriptions</TabsTrigger>
            <TabsTrigger value="teams">Teams &amp; roles</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="space-y-4 pt-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Leave a limit empty for unlimited. Changes appear on the pricing page instantly.</p>
              <Button size="sm" onClick={addTier} className="gap-2"><Plus className="h-4 w-4" /> Add tier</Button>
            </div>

            {tiers.map((tier) => (
              <Card key={tier.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {tier.name} <Badge variant="outline">{tier.key}</Badge>
                    </CardTitle>
                    <CardDescription>{tier.description || "No description"}</CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`active-${tier.id}`} className="text-xs text-muted-foreground">Active</Label>
                      <Switch id={`active-${tier.id}`} checked={tier.is_active} onCheckedChange={(v) => patchTier(tier.id, { is_active: v })} />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteTier(tier.id)} aria-label={`Delete ${tier.name}`}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label>Name</Label>
                      <Input value={tier.name} onChange={(e) => patchTier(tier.id, { name: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Price</Label>
                      <Input type="number" min={0} value={tier.price_amount} onChange={(e) => patchTier(tier.id, { price_amount: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Currency</Label>
                      <Input value={tier.currency} onChange={(e) => patchTier(tier.id, { currency: e.target.value.toUpperCase() })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Max resume uploads</Label>
                      <Input type="number" min={0} placeholder="Unlimited" value={limitText(tier.max_resumes)} onChange={(e) => patchTier(tier.id, { max_resumes: numOrNull(e.target.value) })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Max jobs</Label>
                      <Input type="number" min={0} placeholder="Unlimited" value={limitText(tier.max_jobs)} onChange={(e) => patchTier(tier.id, { max_jobs: numOrNull(e.target.value) })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Max AI interviews</Label>
                      <Input type="number" min={0} placeholder="Unlimited" value={limitText(tier.max_ai_interviews)} onChange={(e) => patchTier(tier.id, { max_ai_interviews: numOrNull(e.target.value) })} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Description</Label>
                    <Input value={tier.description ?? ""} onChange={(e) => patchTier(tier.id, { description: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Features (one per line)</Label>
                    <Textarea rows={4} value={tier.features.join("\n")} onChange={(e) => patchTier(tier.id, { features: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} />
                  </div>
                  <Button onClick={() => saveTier(tier)} disabled={saving === tier.id} className="gap-2">
                    {saving === tier.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save {tier.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="teams" className="space-y-4 pt-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Create teams, invite people by email and assign their platform role.</p>
              <Button size="sm" className="gap-2" onClick={() => setTeamOpen(true)}><Plus className="h-4 w-4" /> New team</Button>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Add a member</CardTitle></CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-4">
                <Select value={memberTeam} onValueChange={setMemberTeam}>
                  <SelectTrigger><SelectValue placeholder="Team" /></SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input placeholder="person@company.com" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} />
                <Select value={memberRole} onValueChange={(v) => setMemberRole(v as AppRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={addMember}>Add member</Button>
              </CardContent>
            </Card>

            {teams.length === 0 && <p className="text-sm text-muted-foreground">No teams yet.</p>}

            {teams.map((team) => (
              <Card key={team.id}>
                <CardHeader>
                  <CardTitle className="text-base">{team.name}</CardTitle>
                  <CardDescription>{team.description || "—"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {members.filter((m) => m.team_id === team.id).length === 0 && (
                    <p className="text-sm text-muted-foreground">No members yet.</p>
                  )}
                  {members.filter((m) => m.team_id === team.id).map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{m.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.user_id ? `Active account · roles: ${(rolesByUser[m.user_id] ?? []).join(", ") || "none"}` : "Pending sign-up"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select value={m.role} onValueChange={(v) => changeMemberRole(m, v as AppRole)}>
                          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => <SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" onClick={() => removeMember(m.id)} aria-label={`Remove ${m.email}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="users" className="space-y-4 pt-4">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <p className="text-sm text-muted-foreground">
                {filteredUsers.length} user{filteredUsers.length === 1 ? "" : "s"} · engagement, subscription and usage across the platform.
              </p>
              <div className="flex items-center gap-2">
                <Input
                  className="w-56"
                  placeholder="Search name, company, plan…"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  aria-label="Search users"
                />
                <Button size="sm" variant="outline" className="gap-2" onClick={exportUsers}>
                  <Download className="h-4 w-4" /> Export CSV
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Total users", value: users.length },
                { label: "Paid subscribers", value: users.filter((u) => u.plan !== "free").length },
                { label: "Resumes scanned", value: users.reduce((s, u) => s + u.resumes, 0) },
                { label: "AI interviews", value: users.reduce((s, u) => s + u.aiInterviews, 0) },
              ].map((s) => (
                <Card key={s.label}>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-semibold">{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr className="text-left">
                      <th className="p-3 font-medium">User</th>
                      <th className="p-3 font-medium">Company</th>
                      <th className="p-3 font-medium">Plan</th>
                      <th className="p-3 font-medium">Roles</th>
                      <th className="p-3 font-medium text-right">Jobs</th>
                      <th className="p-3 font-medium text-right">Resumes</th>
                      <th className="p-3 font-medium text-right">AI interviews</th>
                      <th className="p-3 font-medium">Location</th>
                      <th className="p-3 font-medium">Joined</th>
                      <th className="p-3 font-medium">Last active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan={10} className="p-6 text-center text-muted-foreground">No users match this search.</td></tr>
                    )}
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="border-t">
                        <td className="p-3">
                          <p className="font-medium">{u.full_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{u.email || "—"}</p>
                        </td>
                        <td className="p-3">{u.company_name || "—"}</td>
                        <td className="p-3">
                          <Badge variant={u.plan === "free" ? "outline" : "default"}>{u.plan}</Badge>
                        </td>
                        <td className="p-3 text-xs">{u.roles.length ? u.roles.join(", ").replace(/_/g, " ") : "member"}</td>
                        <td className="p-3 text-right tabular-nums">{u.jobs}</td>
                        <td className="p-3 text-right tabular-nums">{u.resumes}</td>
                        <td className="p-3 text-right tabular-nums">{u.aiInterviews}</td>
                        <td className="p-3 text-xs">{u.location || "—"}</td>
                        <td className="p-3 text-xs">{fmtDate(u.created_at)}</td>
                        <td className="p-3 text-xs">{fmtDate(u.last_active_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>


      <Dialog open={teamOpen} onOpenChange={setTeamOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New team</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Talent acquisition" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={teamDesc} onChange={(e) => setTeamDesc(e.target.value)} placeholder="Handles engineering hiring" />
            </div>
          </div>
          <DialogFooter><Button onClick={createTeam}>Create team</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
