import * as pdfjs from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

export async function extractResumeText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return extractPdf(file);
  if (name.endsWith(".docx")) return extractDocx(file);
  if (name.endsWith(".doc")) {
    throw new Error("Legacy .doc files are not supported. Please save as .docx or PDF.");
  }
  if (name.endsWith(".txt")) return file.text();
  throw new Error("Unsupported file type. Use PDF, DOCX, or TXT.");
}

async function extractPdf(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((it) => ("str" in it ? (it as { str: string }).str : ""))
      .join(" ");
    pages.push(text);
  }
  return pages.join("\n\n").trim();
}

async function extractDocx(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
  return value.trim();
}

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;

const NOISE = /(resume|curriculum|vitae|\bcv\b|profile|portfolio|address|phone|email|linkedin|github|www\.|http)/i;
const NAME_LABEL = /^(name|full name)\s*[:\-]\s*(.+)$/i;

/** Title-cases ALL-CAPS names, leaves mixed-case names untouched. */
function normalizeName(raw: string): string {
  const cleaned = raw.replace(/[,|•·]+/g, " ").replace(/\s+/g, " ").trim();
  if (cleaned === cleaned.toUpperCase()) {
    return cleaned
      .toLowerCase()
      .split(" ")
      .map((w) => (w.length > 1 ? w[0].toUpperCase() + w.slice(1) : w.toUpperCase()))
      .join(" ");
  }
  return cleaned;
}

function looksLikeName(line: string): boolean {
  if (!line || line.length > 60) return false;
  if (NOISE.test(line)) return false;
  if (/[\d@_/\\]/.test(line)) return false;
  const words = line.replace(/[.,]/g, "").split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 5) return false;
  return words.every((w) => /^[A-Za-zÀ-ÖØ-öø-ÿ'’-]{1,20}\.?$/.test(w));
}

/**
 * Extracts the candidate's real full name from the resume content
 * (never from the file name).
 */
export function quickExtractMeta(text: string): { name?: string; email?: string } {
  const email = text.match(EMAIL_RE)?.[0];
  const lines = text
    .split(/\r?\n/)
    .flatMap((l) => l.split(/\s{4,}/))
    .map((l) => l.trim())
    .filter(Boolean);

  // 1. Explicit "Name: ..." label anywhere near the top.
  for (const line of lines.slice(0, 40)) {
    const m = line.match(NAME_LABEL);
    if (m && looksLikeName(m[2].trim())) return { name: normalizeName(m[2].trim()), email };
  }

  // 2. First name-looking line in the header block.
  for (const line of lines.slice(0, 15)) {
    if (looksLikeName(line)) return { name: normalizeName(line), email };
  }

  // 3. Derive from the email local part as a last resort.
  if (email) {
    const local = email.split("@")[0].replace(/\d+/g, "").replace(/[._-]+/g, " ").trim();
    if (looksLikeName(local)) return { name: normalizeName(local), email };
  }
  return { email };
}