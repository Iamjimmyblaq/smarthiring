import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { History, Loader2, PencilLine } from "lucide-react";
import { toast } from "sonner";

interface Props {
  candidateId: string;
  currentName: string | null;
  onSaved?: (name: string) => void;
  /** Renders a compact icon-only trigger instead of a labelled button. */
  compact?: boolean;
}

interface Edit {
  id: string;
  old_name: string | null;
  new_name: string;
  reason: string | null;
  created_at: string;
}

/** Lets an admin/owner correct a wrongly extracted candidate name, keeping full edit history. */
export default function CandidateNameOverride({ candidateId, currentName, onSaved, compact }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName ?? "");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<Edit[]>([]);

  useEffect(() => { setName(currentName ?? ""); }, [currentName]);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("candidate_name_edits")
      .select("id, old_name, new_name, reason, created_at")
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setHistory((data ?? []) as Edit[]));
  }, [open, candidateId]);

  const save = async () => {
    const next = name.trim();
    if (!next) return toast.error("Name is required");
    if (next === (currentName ?? "")) return toast.info("Name unchanged");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("candidates")
      .update({ name: next, name_overridden_at: new Date().toISOString() })
      .eq("id", candidateId);
    if (error) { setSaving(false); return toast.error(error.message); }
    const { error: histErr } = await supabase.from("candidate_name_edits").insert({
      candidate_id: candidateId,
      old_name: currentName,
      new_name: next,
      reason: reason.trim() || null,
      edited_by: u.user?.id ?? null,
    });
    setSaving(false);
    if (histErr) toast.warning(`Name saved, but history entry failed: ${histErr.message}`);
    else toast.success("Candidate name updated");
    setReason("");
    setOpen(false);
    onSaved?.(next);
  };

  return (
    <>
      {compact ? (
        <Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Edit extracted name" onClick={() => setOpen(true)}>
          <PencilLine className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <Button size="sm" variant="outline" className="gap-2" onClick={() => setOpen(true)}>
          <PencilLine className="h-4 w-4" /> Edit name
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Override extracted name</DialogTitle>
            <DialogDescription>
              Correct the full name pulled from the resume. Every change is recorded below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ODAMA JAMES EBANYI" />
            </div>
            <div className="space-y-1.5">
              <Label>Reason (optional)</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Parser picked up the file name" />
            </div>

            <div className="rounded-lg border">
              <p className="flex items-center gap-2 border-b px-3 py-2 text-xs font-medium text-muted-foreground">
                <History className="h-3.5 w-3.5" /> Edit history
              </p>
              {history.length === 0 ? (
                <p className="px-3 py-4 text-xs text-muted-foreground">No manual edits yet.</p>
              ) : (
                <ul className="divide-y text-xs">
                  {history.map((h) => (
                    <li key={h.id} className="px-3 py-2">
                      <p>
                        <span className="line-through text-muted-foreground">{h.old_name || "—"}</span>{" → "}
                        <span className="font-medium">{h.new_name}</span>
                      </p>
                      <p className="text-muted-foreground">
                        {new Date(h.created_at).toLocaleString()}{h.reason ? ` · ${h.reason}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save name
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}