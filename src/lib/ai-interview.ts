import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function publicOrigin() {
  const h = window.location.hostname;
  return h.includes("lovable.app") && !h.includes("id-preview")
    ? window.location.origin
    : "https://smarthiring.lovable.app";
}

type MinimalCandidate = {
  id: string;
  job_id: string | null;
  name?: string | null;
  email?: string | null;
};

/** Creates an AI video interview session, copies the link and opens an email draft. */
export async function createAiInterview(cand: MinimalCandidate, jobTitle?: string | null) {
  if (!cand.job_id) {
    toast.error("This candidate is not linked to a job.");
    return null;
  }
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) {
    toast.error("Please sign in again.");
    return null;
  }
  const { data, error } = await supabase
    .from("interview_sessions")
    .insert({ user_id: u.user.id, job_id: cand.job_id, candidate_id: cand.id })
    .select("token")
    .single();
  if (error) {
    toast.error(error.message);
    return null;
  }
  const link = `${publicOrigin()}/interview/${data.token}`;
  try { await navigator.clipboard.writeText(link); } catch { /* ignore */ }

  if (cand.email) {
    const subject = encodeURIComponent(`AI video interview for ${jobTitle ?? "your application"}`);
    const body = encodeURIComponent(
      `Hi ${cand.name ?? ""},\n\nAs the next step in your application${jobTitle ? ` for ${jobTitle}` : ""}, please complete a short AI video interview.\n\n` +
      `${link}\n\nIt takes about 5–10 minutes. You'll need your camera, microphone and screen sharing enabled. The link expires in 14 days.\n\nGood luck!`
    );
    const a = document.createElement("a");
    a.href = `mailto:${cand.email}?subject=${subject}&body=${body}`;
    a.click();
    toast.success("AI interview link created, copied and email draft opened.");
  } else {
    toast.success("AI interview link created and copied to clipboard.");
  }
  return link;
}
