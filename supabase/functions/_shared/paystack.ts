import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export interface PaystackConfig {
  secretKey: string | null;
  publicKey: string | null;
  currency: string;
  liveMode: boolean;
  source: "database" | "env" | "none";
}

/**
 * Resolve the Paystack config. Admin-managed keys in `payment_settings` win;
 * the PAYSTACK_SECRET_KEY project secret is the fallback.
 */
export async function getPaystackConfig(): Promise<PaystackConfig> {
  const envKey = Deno.env.get("PAYSTACK_SECRET_KEY") ?? null;
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data } = await admin
      .from("payment_settings")
      .select("public_key, secret_key, currency, live_mode")
      .eq("provider", "paystack")
      .maybeSingle();
    if (data?.secret_key) {
      return {
        secretKey: data.secret_key,
        publicKey: data.public_key ?? null,
        currency: data.currency || "USD",
        liveMode: Boolean(data.live_mode),
        source: "database",
      };
    }
    return {
      secretKey: envKey,
      publicKey: data?.public_key ?? null,
      currency: data?.currency || "USD",
      liveMode: Boolean(data?.live_mode),
      source: envKey ? "env" : "none",
    };
  } catch (e) {
    console.error("payment settings lookup failed", e);
    return { secretKey: envKey, publicKey: null, currency: "USD", liveMode: false, source: envKey ? "env" : "none" };
  }
}
