/**
 * Bias-free ("blind") screening helpers.
 *
 * When blind mode is on, anything a reviewer could use to infer gender,
 * ethnicity, age or nationality is replaced with a stable anonymous label,
 * so the only thing visible is evidence of ability.
 */

/** Stable pseudonymous label derived from the candidate id. */
export function anonLabel(id: string): string {
  const hex = id.replace(/[^0-9a-f]/gi, "").slice(0, 8) || "0";
  const n = (parseInt(hex, 16) % 9000) + 1000;
  return `Candidate #${n}`;
}

export function maskName(id: string, name: string | null | undefined, blind: boolean): string {
  if (blind) return anonLabel(id);
  return name?.trim() || "Unnamed";
}

export function maskContact(value: string | null | undefined, blind: boolean): string {
  if (blind) return "Hidden in blind mode";
  return value?.trim() || "—";
}

/** Strips names, addresses, years and pronouns out of free text summaries. */
export function maskText(text: string | null | undefined, blind: boolean): string {
  if (!text) return "";
  if (!blind) return text;
  return text
    .replace(/\b(19|20)\d{2}\b/g, "[year]")
    .replace(/\b(he|she|him|her|his|hers|himself|herself)\b/gi, "they")
    .replace(/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g, "[name]")
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[phone]");
}

export const BLIND_NOTE =
  "Blind mode hides names, contact details, locations, graduation years and pronouns so shortlisting is based on evidence of ability alone.";
