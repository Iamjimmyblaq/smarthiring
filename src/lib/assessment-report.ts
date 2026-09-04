import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface AssessmentGradedAnswer {
  question_id?: string;
  prompt?: string;
  selected_text?: string | null;
  correct_text?: string | null;
  correct?: boolean;
  time_ms?: number | null;
}

export interface AssessmentReportInput {
  candidateName: string;
  candidateEmail?: string | null;
  testTitle: string;
  skillArea?: string | null;
  difficulty?: string | null;
  status: string;
  submittedAt?: string | null;
  score?: number | null;
  maxScore?: number | null;
  percentage?: number | null;
  plagiarismScore?: number | null;
  integrityFlags?: Record<string, unknown> | null;
  proctoring?: Record<string, unknown> | null;
  answers?: AssessmentGradedAnswer[];
}

const MARGIN = 40;

function lastY(doc: jsPDF) {
  // deno-lint-ignore no-explicit-any
  return (doc as any).lastAutoTable.finalY as number;
}

function integrityRows(input: AssessmentReportInput): [string, string][] {
  const flags = input.integrityFlags ?? {};
  const rows: [string, string][] = [
    ["Verdict", typeof flags.verdict === "string" ? flags.verdict : "—"],
    ["Plagiarism / anomaly score", input.plagiarismScore != null ? `${input.plagiarismScore}` : "—"],
  ];
  for (const [k, v] of Object.entries(flags)) {
    if (k === "verdict") continue;
    rows.push([k.replace(/_/g, " "), Array.isArray(v) ? v.join(", ") : String(v)]);
  }
  const p = (input.proctoring ?? {}) as Record<string, number | boolean | undefined>;
  if (input.proctoring) {
    rows.push(["Camera", p.cameraEnabled ? "On for the full test" : "Not enabled"]);
    rows.push(["Tab / window switches", String(p.tabSwitches ?? 0)]);
    rows.push(["Left camera frame", `${p.awayFromFrameEvents ?? 0} time(s)`]);
    rows.push(["High-movement events", String(p.highMotionEvents ?? 0)]);
    rows.push([
      "Duration",
      p.durationSeconds ? `${Math.max(1, Math.round(Number(p.durationSeconds) / 60))} min` : "—",
    ]);
  }
  return rows;
}

/** Renders one candidate's assessment result onto the given document, starting at `startY`. */
function renderOne(doc: jsPDF, input: AssessmentReportInput, startY: number) {
  let y = startY;
  doc.setFontSize(16);
  doc.text("Skills Assessment Report", MARGIN, y);
  y += 18;
  doc.setFontSize(11);
  doc.setTextColor(110);
  doc.text(
    `${input.candidateName}${input.candidateEmail ? ` · ${input.candidateEmail}` : ""} · ${input.testTitle}`,
    MARGIN,
    y,
  );
  doc.setTextColor(0);
  y += 18;

  autoTable(doc, {
    startY: y,
    head: [["Result", "Value"]],
    body: [
      ["Score", input.score != null ? `${input.score}/${input.maxScore ?? "—"}` : "—"],
      ["Percentage", input.percentage != null ? `${input.percentage}%` : "—"],
      ["Status", input.status.replace(/_/g, " ")],
      ["Skill area", input.skillArea ?? "—"],
      ["Difficulty", input.difficulty ?? "—"],
      ["Submitted", input.submittedAt ? new Date(input.submittedAt).toLocaleString() : "—"],
    ],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [37, 99, 235] },
    margin: { left: MARGIN, right: MARGIN },
  });
  y = lastY(doc) + 16;

  autoTable(doc, {
    startY: y,
    head: [["Integrity & proctoring", "Observation"]],
    body: integrityRows(input),
    styles: { fontSize: 10 },
    columnStyles: { 1: { cellWidth: 300 } },
    headStyles: { fillColor: [190, 24, 93] },
    margin: { left: MARGIN, right: MARGIN },
  });
  y = lastY(doc) + 16;

  const answers = input.answers ?? [];
  if (answers.length) {
    autoTable(doc, {
      startY: y,
      head: [["#", "Question", "Answer given", "Correct answer", "✓"]],
      body: answers.map((a, i) => [
        String(i + 1),
        a.prompt ?? "—",
        a.selected_text ?? "No answer",
        a.correct_text ?? "—",
        a.correct ? "Yes" : "No",
      ]),
      styles: { fontSize: 8, cellWidth: "wrap", valign: "top" },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 190 },
        2: { cellWidth: 130 },
        3: { cellWidth: 130 },
        4: { cellWidth: 25 },
      },
      headStyles: { fillColor: [71, 85, 105] },
      margin: { left: MARGIN, right: MARGIN },
    });
    y = lastY(doc) + 16;
  }
  return y;
}

const safeName = (s: string) => s.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "candidate";

export function downloadAssessmentPdf(input: AssessmentReportInput) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  renderOne(doc, input, 46);
  doc.save(`assessment-${safeName(input.candidateName)}-${safeName(input.testTitle)}.pdf`);
}

export function downloadAssessmentsBulkPdf(inputs: AssessmentReportInput[], fileLabel = "assessments") {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  doc.setFontSize(18);
  doc.text("Assessment results summary", MARGIN, 50);
  autoTable(doc, {
    startY: 70,
    head: [["Candidate", "Assessment", "Score", "%", "Status", "Integrity"]],
    body: inputs.map((i) => [
      i.candidateName,
      i.testTitle,
      i.score != null ? `${i.score}/${i.maxScore ?? "—"}` : "—",
      i.percentage != null ? `${i.percentage}%` : "—",
      i.status.replace(/_/g, " "),
      typeof i.integrityFlags?.verdict === "string" ? String(i.integrityFlags.verdict) : "—",
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [15, 118, 110] },
    margin: { left: MARGIN, right: MARGIN },
  });

  inputs.forEach((input) => {
    doc.addPage();
    renderOne(doc, input, 46);
  });

  doc.save(`${safeName(fileLabel)}-results.pdf`);
}
