import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const PaymentVerify = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your payment…");

  useEffect(() => {
    const reference = params.get("reference") || params.get("trxref");
    if (!reference) {
      setStatus("error");
      setMessage("Missing payment reference.");
      return;
    }
    (async () => {
      const { data, error } = await supabase.functions.invoke("paystack-verify", {
        body: { reference },
      });
      if (error || data?.error) {
        setStatus("error");
        setMessage(data?.error || error?.message || "Verification failed");
      } else {
        setStatus("success");
        setMessage("You're now on Pro. Welcome aboard!");
      }
    })();
  }, [params]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto py-16 max-w-md">
        <Card>
          <CardContent className="pt-8 text-center space-y-4">
            {status === "loading" && <Loader2 className="h-10 w-10 animate-spin mx-auto text-muted-foreground" />}
            {status === "success" && <CheckCircle2 className="h-10 w-10 mx-auto text-accent" />}
            {status === "error" && <XCircle className="h-10 w-10 mx-auto text-destructive" />}
            <p className="text-lg">{message}</p>
            {status !== "loading" && (
              <Button className="w-full" onClick={() => navigate("/jobs")}>Go to dashboard</Button>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PaymentVerify;