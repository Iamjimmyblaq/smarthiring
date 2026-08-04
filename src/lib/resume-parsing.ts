import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ParseStatus = "pending" | "processing" | "done" | "error";

export const normalizeParseStatus = (v: string | null | undefined): ParseStatus => {
  if (v === "done" || v === "error" || v === "processing") return v;
  return "pending";
};

export interface ParseProgress {
  total: number;
  done: number;
  failed: number;
  inFlight: number;
  percent: number;
}

/** Aggregates resume parsing/scoring progress across a set of candidates. */
export function parseProgress(rows: { processing_status: string | null }[]): ParseProgress {
  const total = rows.length;
  const done = rows.filter((r) => normalizeParseStatus(r.processing_status) === "done").length;
  const failed = rows.filter((r) => normalizeParseStatus(r.processing_status) === "error").length;
  const inFlight = total - done - failed;
  return { total, done, failed, inFlight, percent: total ? Math.round(((done + failed) / total) * 100) : 0 };
}

/** Re-runs AI parsing/scoring for a candidate whose resume failed to parse. */
export async function retryResumeParse(candidateId: string): Promise<boolean> {
  const { error: resetError } = await supabase
    .from("candidates")
    .update({ processing_status: "pending", error_message: null })
    .eq("id", candidateId);
  if (resetError) {
    toast.error(resetError.message);
    return false;
  }
  const { error } = await supabase.functions.invoke("score-candidate", {
    body: { candidate_id: candidateId },
  });
  if (error) {
    const message = error instanceof Error ? error.message : "Retry failed";
    await supabase
      .from("candidates")
      .update({ processing_status: "error", error_message: message })
      .eq("id", candidateId);
    toast.error(message);
    return false;
  }
  toast.success("Re-scanning resume…");
  return true;
}

/** Retries every failed resume in the given list, sequentially. */
export async function retryAllFailed(rows: { id: string; processing_status: string | null }[]) {
  const failed = rows.filter((r) => normalizeParseStatus(r.processing_status) === "error");
  if (failed.length === 0) return;
  toast.info(`Retrying ${failed.length} failed resume${failed.length === 1 ? "" : "s"}…`);
  for (const row of failed) await retryResumeParse(row.id);
}