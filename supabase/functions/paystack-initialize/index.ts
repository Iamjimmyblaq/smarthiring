import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const user = userData.user;

    const body = await req.json().catch(() => ({} as any));
    const callback_url = body?.callback_url;
    const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET) return json({ error: "Paystack not configured" }, 500);

    // Pro plan: $29/mo. Default to USD so the checkout is open to customers
    // worldwide (Paystack accepts international cards for USD transactions).
    // Body can override currency/amount for regional pricing.
    const currency: string = (body?.currency as string) || "USD";
    const amount: number = Number(body?.amount) || (currency === "NGN" ? 4350000 : 2900);

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount,
        currency,
        callback_url,
        channels: ["card", "bank", "apple_pay", "ussd", "qr", "mobile_money", "bank_transfer"],
        metadata: { user_id: user.id, plan: "pro" },
      }),
    });
    const data = await res.json();
    if (!data.status) return json({ error: data.message || "Init failed" }, 400);

    return json({ authorization_url: data.data.authorization_url, reference: data.data.reference });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}