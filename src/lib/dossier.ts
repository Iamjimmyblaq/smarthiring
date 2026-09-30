import { supabase } from "@/integrations/supabase/client";

export interface DossierOptions {
  pin?: string | undefined;
  expiresDays?: number | undefined;
  recipientName?: string | undefined;
  recipientEmail?: string | undefined;
}

function makeToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Creates a shareable, read-only hiring-manager dossier link for a candidate. */
export async function createDossier(candidateId: string, opts: DossierOptions = {}) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("You need to be signed in.");

  const token = makeToken();
  const expires = new Date();
  expires.setDate(expires.getDate() + (opts.expiresDays ?? 30));

  const { error } = await supabase.from("candidate_dossiers").insert({
    user_id: userData.user.id,
    candidate_id: candidateId,
    token,
    pin: opts.pin?.trim() || null,
    recipient_name: opts.recipientName?.trim() || null,
    recipient_email: opts.recipientEmail?.trim() || null,
    expires_at: expires.toISOString(),
  });
  if (error) throw error;

  return { token, url: `https://talenval.lovable.app/dossier/${token}`, expiresAt: expires.toISOString() };
}
