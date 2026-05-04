import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, FileText, Trash2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Offer = Tables<"offers">;
type Candidate = Pick<Tables<"candidates">, "id" | "name" | "job_id">;

export default function Offers() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Offer[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [candidateId, setCandidateId] = useState("");
  const [salary, setSalary] = useState<string>("");
  const [currency, setCurrency] = useState("USD");
  const [startDate, setStartDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = "Offers — SmartHire";
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate("/auth", { replace: true });
      else load();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: o }, { data: c }] = await Promise.all([
      supabase.from("offers").select("*").order("created_at", { ascending: false }),
      supabase.from("candidates").select("id, name, job_id"),
    ]);
    setItems(o ?? []);
    setCandidates(c ?? []);
    setLoading(false);
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const cand = candidates.find((c) => c.id === candidateId);
    if (!u.user || !cand) { setSaving(false); return; }
    const { error } = await supabase.from("offers").insert({
      user_id: u.user.id,
      candidate_id: cand.id,
      job_id: cand.job_id,
      salary_amount: salary ? Number(salary) : null,
      salary_currency: currency,
      start_date: startDate || null,
      status: "draft",
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    await supabase.from("candidates").update({ stage: "offer" }).eq("id", cand.id);
    toast.success("Offer created");
    setOpen(false);
    setCandidateId(""); setSalary(""); setStartDate("");
    load();
  };

  const updateStatus = async (id: string, status: string, candidateId: string) => {
    const patch: { status: string; sent_at?: string; responded_at?: string } = { status };
    if (status === "sent") patch.sent_at = new Date().toISOString();
    if (status === "accepted" || status === "declined") patch.responded_at = new Date().toISOString();
    const { error } = await supabase.from("offers").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    if (status === "accepted") {
      await supabase.from("candidates").update({ stage: "hired" }).eq("id", candidateId);
    }
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete offer?")) return;
    const { error } = await supabase.from("offers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItems((x) => x.filter((i) => i.id !== id));
  };

  const candName = (id: string) => candidates.find((c) => c.id === id)?.name ?? "Candidate";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Offers</h1>
            <p className="text-muted-foreground mt-1">Manage offer letters and acceptance tracking.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> New offer</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create offer</DialogTitle></DialogHeader>
              <form onSubmit={create} className="space-y-4">
                <div className="space-y-2">
                  <Label>Candidate</Label>
                  <Select value={candidateId} onValueChange={setCandidateId}>
                    <SelectTrigger><SelectValue placeholder="Select candidate" /></SelectTrigger>
                    <SelectContent>
                      {candidates.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name ?? "Unnamed"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2 col-span-2">
                    <Label>Salary</Label>
                    <Input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="120000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="NGN">NGN</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Start date</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={saving || !candidateId}>{saving ? "Saving…" : "Create"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent className="space-y-2">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-lg font-medium">No offers yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((o) => (
              <Card key={o.id}>
                <CardContent className="py-4 flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-medium">{candName(o.candidate_id)}</p>
                    <p className="text-sm text-muted-foreground">
                      {o.salary_amount ? `${o.salary_currency} ${Number(o.salary_amount).toLocaleString()}` : "No salary set"}
                      {o.start_date ? ` · starts ${new Date(o.start_date).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <Badge variant={o.status === "accepted" ? "default" : o.status === "declined" ? "destructive" : "outline"}>
                    {o.status}
                  </Badge>
                  <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v, o.candidate_id)}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="declined">Declined</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => remove(o.id)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}