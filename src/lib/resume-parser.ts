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

export function quickExtractMeta(text: string): { name?: string; email?: string } {
  const email = text.match(EMAIL_RE)?.[0];
  const firstLine = text.split(/\r?\n/).map((l) => l.trim()).find((l) => l.length > 0 && l.length < 80);
  const name = firstLine && !firstLine.includes("@") && /[A-Za-z]/.test(firstLine) ? firstLine : undefined;
  return { name, email };
}