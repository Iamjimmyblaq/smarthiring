import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, Loader2, PlugZap, Save, XCircle } from "lucide-react";

interface Settings {
  public_key: string | null;
  secret_key_masked: string | null;
  secret_key_set: boolean;
  secret_source: "database" | "env" | "none";
  currency: string;
  live_mode: boolean;
  updated_at: string | null;
}

const CURRENCIES = ["USD", "NGN", "GHS", "ZAR", "KES", "EUR", "GBP"];

export default function PaymentSettingsTab() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [secretKey, setSecretKey] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [liveMode, setLiveMode] = useState(false);

  const call = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("admin-payment-settings", { body });
    if (error) throw error;
    if ((data as any)?.error) throw new Error((data as any).error);
    return data;
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = (await call({ action: "get" })) as Settings;
      setSettings(data);
      setPublicKey(data.public_key ?? "");
      setCurrency(data.currency || "USD");
      setLiveMode(Boolean(data.live_mode));
    } catch (e: any) {
      toast.error(e.message || "Could not load payment settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      await call({
        action: "save",
        public_key: publicKey.trim() || undefined,
        secret_key: secretKey.trim() || undefined,
        currency,
        live_mode: liveMode,
      });
      setSecretKey("");
      toast.success("Payment settings saved");
      await load();
      await runTest();
    } catch (e: any) {
      toast.error(e.message || "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  const runTest = async () => {
    setTesting(true);
    try {
      const data = (await call({ action: "test" })) as { ok: boolean; message: string };
      setTestResult(data);
      data.ok ? toast.success(data.message) : toast.error(data.message);
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message || "Test failed" });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center gap-2 py-10 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading payment settings…</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2"><PlugZap className="h-5 w-5" /> Paystack gateway</CardTitle>
              <CardDescription>
                Keys are stored securely in the backend and used for every checkout. Saving a new secret key takes effect immediately.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={settings?.secret_key_set ? "default" : "secondary"}>
                {settings?.secret_key_set ? (settings.live_mode ? "Live mode" : "Test mode") : "Not configured"}
              </Badge>
              {settings?.secret_source === "env" && <Badge variant="outline">Using environment key</Badge>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ps-secret">Secret key</Label>
              <Input
                id="ps-secret"
                type="password"
                autoComplete="off"
                placeholder={settings?.secret_key_masked || "sk_test_… or sk_live_…"}
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {settings?.secret_key_masked ? `Current key: ${settings.secret_key_masked}. Leave blank to keep it.` : "Paste the secret key from your Paystack dashboard."}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ps-public">Public key</Label>
              <Input id="ps-public" placeholder="pk_test_… or pk_live_…" value={publicKey} onChange={(e) => setPublicKey(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Checkout currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="ps-live">Live payments</Label>
                <p className="text-xs text-muted-foreground">Off = sandbox test transactions.</p>
              </div>
              <Switch id="ps-live" checked={liveMode} onCheckedChange={setLiveMode} />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save & verify
            </Button>
            <Button variant="outline" onClick={runTest} disabled={testing} className="gap-2">
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />} Test connection
            </Button>
            {settings?.updated_at && (
              <span className="text-xs text-muted-foreground">Last updated {new Date(settings.updated_at).toLocaleString()}</span>
            )}
          </div>

          {testResult && (
            <div className={`flex items-start gap-2 rounded-md border p-3 text-sm ${testResult.ok ? "border-accent/40 bg-accent/5" : "border-destructive/40 bg-destructive/5"}`}>
              {testResult.ok ? <CheckCircle2 className="h-4 w-4 text-accent mt-0.5" /> : <XCircle className="h-4 w-4 text-destructive mt-0.5" />}
              <span>{testResult.message}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How checkout flows</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>1. A customer picks a tier on the pricing page and can apply a coupon code — the discounted total is calculated server-side.</p>
          <p>2. Checkout opens on Paystack using the key above, with the tier and coupon recorded on the transaction.</p>
          <p>3. On success the payment is verified server-side and the customer is upgraded to exactly the tier they paid for, with the coupon redemption recorded.</p>
          <p>4. A fully discounted (100% off) checkout skips Paystack and activates the plan instantly.</p>
        </CardContent>
      </Card>
    </div>
  );
}
