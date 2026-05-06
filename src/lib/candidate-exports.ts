import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { STAGES, type StageKey } from "@/lib/lifecycle";

export type ExportCandidate = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  stage: string | null;
  status: string | null;
  overall_score: number | null;
  skills_score: number | null;
  experience_score: number | null;
  education_score: number | null;
  years_experience: number | null;
  matched_skills: string[] | null;
  missing_skills: string[] | null;
  jobs?: { title: string } | null;
};

const HEADERS = [
  "Name",
  "Email",
  "Phone",
  "Job",
  "Stage",
  "Status",
  "Overall",
  "Skills",
  "Experience",
  "Education",
  "Years exp.",
  "Matched skills",
  "Missing skills",
];

const toRow = (c: ExportCandidate) => [
  c.name ?? "",
  c.email ?? "",
  c.phone ?? "",
  c.jobs?.title ?? "",
  stageLabel(c.stage),
  c.status ?? "",
  c.overall_score ?? "",
  c.skills_score ?? "",
  c.experience_score ?? "",
  c.education_score ?? "",
  c.years_experience ?? "",
  (c.matched_skills ?? []).join(", "),
  (c.missing_skills ?? []).join(", "),
];

const stageLabel = (key: string | null) =>
  STAGES.find((s) => s.key === (key as StageKey))?.label ?? key ?? "";

const safeSheetName = (name: string) =>
  name.replace(/[\\/?*[\]:]/g, "").slice(0, 31) || "Sheet";

const ts = () => new Date().toISOString().slice(0, 10);

export function exportStageExcel(stageKey: StageKey, candidates: ExportCandidate[]) {
  const label = stageLabel(stageKey);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...candidates.map(toRow)]);
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName(label));
  XLSX.writeFile(wb, `candidates-${stageKey}-${ts()}.xlsx`);
}

export function exportAllStagesExcel(candidates: ExportCandidate[]) {
  const wb = XLSX.utils.book_new();
  const all = XLSX.utils.aoa_to_sheet([HEADERS, ...candidates.map(toRow)]);
  XLSX.utils.book_append_sheet(wb, all, "All candidates");
  for (const s of STAGES) {
    const list = candidates.filter((c) => (c.stage ?? "sourced") === s.key);
    const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...list.map(toRow)]);
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName(s.label));
  }
  XLSX.writeFile(wb, `candidates-all-stages-${ts()}.xlsx`);
}

function buildPdf(title: string, sections: { heading: string; rows: ExportCandidate[] }[]) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(16);
  doc.text(title, 14, 14);
  doc.setFontSize(10);
  doc.text(`Generated ${new Date().toLocaleString()}`, 14, 20);

  let startY = 26;
  sections.forEach((sec, i) => {
    if (i > 0) startY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY
      ? (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
      : startY;
    doc.setFontSize(12);
    doc.text(`${sec.heading} (${sec.rows.length})`, 14, startY);
    autoTable(doc, {
      startY: startY + 3,
      head: [HEADERS],
      body: sec.rows.map(toRow).map((r) => r.map((v) => String(v))),
      styles: { fontSize: 7, cellPadding: 1.5, overflow: "linebreak" },
      headStyles: { fillColor: [30, 41, 59] },
      columnStyles: { 11: { cellWidth: 40 }, 12: { cellWidth: 40 } },
      margin: { left: 10, right: 10 },
    });
  });

  return doc;
}

export function exportStagePdf(stageKey: StageKey, candidates: ExportCandidate[]) {
  const label = stageLabel(stageKey);
  const doc = buildPdf(`Candidates — ${label}`, [{ heading: label, rows: candidates }]);
  doc.save(`candidates-${stageKey}-${ts()}.pdf`);
}

export function exportAllStagesPdf(candidates: ExportCandidate[]) {
  const sections = STAGES.map((s) => ({
    heading: s.label,
    rows: candidates.filter((c) => (c.stage ?? "sourced") === s.key),
  }));
  const doc = buildPdf("Candidates — All Stages", sections);
  doc.save(`candidates-all-stages-${ts()}.pdf`);
}