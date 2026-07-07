import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, Key, Plus, Trash2, Webhook } from "lucide-react";

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api/v1`;

async function sha256Hex(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomKey() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  const hex = Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
  return "sh_live_" + hex;
}

export default function Developers() {
  const navigate = useNavigate();
  const [keys, setKeys] = useState<any[]>([]);
  const [hooks, setHooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);
  const [openKey, setOpenKey] = useState(false);
  const [openHook, setOpenHook] = useState(false);
  const [hookUrl, setHookUrl] = useState("");

  useEffect(() => {
    document.title = "Developers — SmartHire API";
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate("/auth", { replace: true });
      else load();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: k }, { data: h }] = await Promise.all([
      supabase.from("api_keys").select("id, name, key_prefix, last_used_at, revoked_at, created_at").order("created_at", { ascending: false }),
      supabase.from("webhook_endpoints").select("id, url, events, enabled, secret, created_at").order("created_at", { ascending: false }),
    ]);
    setKeys(k ?? []); setHooks(h ?? []); setLoading(false);
  };

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const plain = randomKey();
    const hash = await sha256Hex(plain);
    const { error } = await supabase.from("api_keys").insert({
      user_id: u.user.id, name: newKeyName.trim(), key_prefix: plain.slice(0, 12), key_hash: hash,
    });
    if (error) return toast.error(error.message);
    setRevealed(plain); setNewKeyName(""); setOpenKey(false); load();
  };

  const revoke = async (id: string) => {
    if (!confirm("Revoke this API key? Applications using it will stop working.")) return;
    await supabase.from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  const createHook = async () => {
    if (!hookUrl.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const secret = "whsec_" + crypto.randomUUID().replace(/-/g, "");
    const { error } = await supabase.from("webhook_endpoints").insert({
      user_id: u.user.id, url: hookUrl.trim(), secret, events: [], enabled: true,
    });
    if (error) return toast.error(error.message);
    setHookUrl(""); setOpenHook(false); load();
  };

  const removeHook = async (id: string) => {
    if (!confirm("Delete webhook?")) return;
    await supabase.from("webhook_endpoints").delete().eq("id", id);
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Developers</h1>
          <p className="text-muted-foreground mt-1">API keys and webhooks for integrating SmartHire with your systems.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Base URL: <code className="bg-muted px-2 py-1 rounded">{API_BASE}</code> ·{" "}
            <a href="/api-docs" className="underline">Read the API docs →</a>
          </p>
        </div>

        {revealed && (
          <Card className="border-emerald-500/40 bg-emerald-500/5">
            <CardHeader><CardTitle className="text-emerald-700 dark:text-emerald-300">New API key created</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">Copy this now — it won't be shown again.</p>
              <div className="flex gap-2">
                <Input readOnly value={revealed} className="font-mono text-xs" />
                <Button onClick={() => { navigator.clipboard.writeText(revealed); toast.success("Copied"); }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="ghost" onClick={() => setRevealed(null)}>Dismiss</Button>
            </CardContent>
          </Card>
        )}

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2"><Key className="h-5 w-5" /> API keys</h2>
            <Dialog open={openKey} onOpenChange={setOpenKey}>
              <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> New key</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create API key</DialogTitle></DialogHeader>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="Production backend" />
                </div>
                <DialogFooter><Button onClick={createKey}>Generate</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          {loading ? <p className="text-muted-foreground">Loading…</p> : keys.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No API keys yet.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {keys.map((k) => (
                <Card key={k.id}>
                  <CardContent className="py-4 flex items-center gap-4">
                    <div className="flex-1">
                      <p className="font-medium">{k.name}</p>
                      <p className="text-sm text-muted-foreground font-mono">{k.key_prefix}…{" · "}created {new Date(k.created_at).toLocaleDateString()}{k.last_used_at ? ` · last used ${new Date(k.last_used_at).toLocaleDateString()}` : " · never used"}</p>
                    </div>
                    {k.revoked_at ? <Badge variant="destructive">Revoked</Badge> : (
                      <Button variant="ghost" size="sm" onClick={() => revoke(k.id)}><Trash2 className="h-4 w-4" /></Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2"><Webhook className="h-5 w-5" /> Webhooks</h2>
            <Dialog open={openHook} onOpenChange={setOpenHook}>
              <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Add endpoint</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New webhook endpoint</DialogTitle></DialogHeader>
                <div className="space-y-2">
                  <Label>URL</Label>
                  <Input value={hookUrl} onChange={(e) => setHookUrl(e.target.value)} placeholder="https://your-app.com/webhooks/smarthire" />
                  <p className="text-xs text-muted-foreground">We'll POST JSON events signed with HMAC-SHA256 in the <code>X-SmartHire-Signature</code> header.</p>
                </div>
                <DialogFooter><Button onClick={createHook}>Create</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          {hooks.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No webhooks configured.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {hooks.map((h) => (
                <Card key={h.id}>
                  <CardContent className="py-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm truncate">{h.url}</p>
                      <p className="text-xs text-muted-foreground mt-1">Secret: <code>{h.secret}</code></p>
                    </div>
                    <Badge variant={h.enabled ? "default" : "outline"}>{h.enabled ? "Active" : "Disabled"}</Badge>
                    <Button variant="ghost" size="sm" onClick={() => removeHook(h.id)}><Trash2 className="h-4 w-4" /></Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}