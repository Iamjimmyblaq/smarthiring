import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Copy, Link2, Mail, ShieldCheck } from "lucide-react";
import { createDossier } from "@/lib/dossier";

interface Props {
  candidateId: string | null;
  candidateName: string;
  jobTitle?: string;
  onClose: () => void;
}

export default function ShareDossierDialog({ candidateId, candidateName, jobTitle, onClose }: Props) {
  const [usePin, setUsePin] = useState(false);
  const [pin, setPin] = useState("");
  const [days, setDays] = useState("30");
  const [recipient, setRecipient] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => { setLink(""); setPin(""); setRecipient(""); setUsePin(false); onClose(); };

  const generate = async () => {
    if (!candidateId) return;
    setBusy(true);
    try {
      const res = await createDossier(candidateId, {
        pin: usePin ? pin : undefined,
        expiresDays: Number(days) || 30,
        recipientEmail: recipient,
      });
      setLink(res.url);
      toast.success("Share link ready.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const mailto = () => {
    const subject = encodeURIComponent(`Candidate for review: ${candidateName}${jobTitle ? ` — ${jobTitle}` : ""}`);
    const body = encodeURIComponent(
      `Hi,\n\nHere's the full evaluation dossier for ${candidateName}${jobTitle ? ` (${jobTitle})` : ""}:\n${link}\n` +
      (usePin && pin ? `\nPIN: ${pin}\n` : "") +
      `\nYou can approve, request an in-person interview, or decline with feedback straight from the page.\n\nThanks!`,
    );
    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
  };

  return (
    <Dialog open={Boolean(candidateId)} onOpenChange={(o) => !o && reset()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" /> Share {candidateName} with a hiring manager
          </DialogTitle>
        </DialogHeader>

        {link ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Anyone with this link sees the full scorecard, interview summary and assessment results — and can
              send their decision back to you. No account needed.
            </p>
            <div className="flex items-center gap-2">
              <Input readOnly value={link} />
              <Button size="icon" variant="outline" aria-label="Copy link" onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copied"); }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {usePin && pin && (
              <p className="text-xs text-muted-foreground">PIN: <strong>{pin}</strong> — share it separately.</p>
            )}
            {recipient && (
              <Button className="w-full gap-2" onClick={mailto}><Mail className="h-4 w-4" /> Email it to {recipient}</Button>
            )}
            <Button variant="ghost" className="w-full" onClick={reset}>Done</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="rec">Hiring manager email (optional)</Label>
              <Input id="rec" type="email" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="vp.engineering@company.com" />
            </div>
            <div>
              <Label htmlFor="days">Link expires in (days)</Label>
              <Input id="days" type="number" min={1} max={365} value={days} onChange={(e) => setDays(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="pinon" checked={usePin} onCheckedChange={setUsePin} />
              <Label htmlFor="pinon" className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" /> Protect with a PIN
              </Label>
            </div>
            {usePin && (
              <Input value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Choose a PIN" aria-label="PIN" />
            )}
            <Button className="w-full" onClick={generate} disabled={busy || (usePin && !pin.trim())}>
              {busy ? "Creating…" : "Create share link"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
