import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ProctoringData {
  durationSeconds?: number;
  cameraEnabled?: boolean;
  screenShared?: boolean;
  screenShareStops?: number;
  tabSwitches?: number;
  windowBlurSeconds?: number;
  motionSamples?: number;
  averageMotion?: number;
  peakMotion?: number;
  highMotionEvents?: number;
  awayFromFrameEvents?: number;
  awayFromFrameSeconds?: number;
  multipleFacesSuspected?: number;
  events?: { at: string; type: string; detail?: string }[];
}

export interface ProctoringReportInput {
  candidateName: string;
  jobTitle: string;
  completedAt?: string | null;
  scores: Record<string, number>;
  sentiment?: string | null;
  recommendation?: string | null;
  summary?: string | null;
  proctoring: ProctoringData | null;
  transcript: { role: string; text: string }[];
}

export function composureFromProctoring(p: ProctoringData | null) {
  if (!p) return { label: "Not captured", score: null as number | null };
  let score = 100;
  score -= Math.min(30, (p.tabSwitches ?? 0) * 6);
  score -= Math.min(25, (p.awayFromFrameEvents ?? 0) * 5);
  score -= Math.min(20, (p.highMotionEvents ?? 0) * 2);
  score -= p.screenShared === false ? 10 : 0;
  score -= Math.min(15, (p.screenShareStops ?? 0) * 5);
  score = Math.max(0, Math.round(score));
  const label =
    score >= 85 ? "Excellent — calm and consistently present"
    : score >= 70 ? "Good — minor distractions detected"
    : score >= 50 ? "Fair — several attention lapses"
    : "Poor — significant proctoring flags";
  return { label, score };
}

export function proctoringRows(p: ProctoringData | null): [string, string][] {
  if (!p) return [["Proctoring data", "Not captured for this session"]];
  const composure = composureFromProctoring(p);
  const mins = p.durationSeconds ? Math.max(1, Math.round(p.durationSeconds / 60)) : null;
  return [
    ["Composure", `${composure.label}${composure.score !== null ? ` (${composure.score}/100)` : ""}`],
    ["Interview length", mins ? `${mins} min` : "n/a"],
    ["Camera", p.cameraEnabled ? "On for the full session" : "Not enabled"],
    ["Screen sharing", p.screenShared ? `Active${p.screenShareStops ? ` · stopped ${p.screenShareStops}x` : ""}` : "Not shared"],
    ["Camera movement", `avg ${Math.round(p.averageMotion ?? 0)} · peak ${Math.round(p.peakMotion ?? 0)} · ${p.highMotionEvents ?? 0} high-movement events`],
    ["Left camera frame", `${p.awayFromFrameEvents ?? 0} time(s)${p.awayFromFrameSeconds ? ` · ~${Math.round(p.awayFromFrameSeconds)}s total` : ""}`],
    ["Tab / window switches", `${p.tabSwitches ?? 0}${p.windowBlurSeconds ? ` · ~${Math.round(p.windowBlurSeconds)}s off-screen` : ""}`],
    ["Multiple faces suspected", String(p.multipleFacesSuspected ?? 0)],
  ];
}

export function downloadProctoringPdf(input: ProctoringReportInput) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 40;
  let y = 46;

  doc.setFontSize(18);
  doc.text("AI Interview & Proctoring Report", marginX, y);
  y += 20;
  doc.setFontSize(11);
  doc.setTextColor(110);
  doc.text(
    `${input.candidateName} · ${input.jobTitle}${input.completedAt ? ` · ${new Date(input.completedAt).toLocaleString()}` : ""}`,
    marginX,
    y,
  );
  doc.setTextColor(0);
  y += 22;

  autoTable(doc, {
    startY: y,
    head: [["Score", "Value"]],
    body: ["overall", "communication", "confidence", "technical", "composure"].map((k) => [
      k.charAt(0).toUpperCase() + k.slice(1),
      input.scores?.[k] != null ? `${input.scores[k]}/100` : "—",
    ]),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [37, 99, 235] },
    margin: { left: marginX, right: marginX },
  });
  // deno-lint-ignore no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 18;

  autoTable(doc, {
    startY: y,
    head: [["Assessment", "Detail"]],
    body: [
      ["Sentiment", input.sentiment ?? "—"],
      ["Recommendation", input.recommendation?.replace(/_/g, " ") ?? "—"],
      ["Summary", input.summary || "No summary generated"],
    ],
    styles: { fontSize: 10, cellWidth: "wrap" },
    columnStyles: { 1: { cellWidth: 360 } },
    headStyles: { fillColor: [15, 118, 110] },
    margin: { left: marginX, right: marginX },
  });
  // deno-lint-ignore no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 18;

  autoTable(doc, {
    startY: y,
    head: [["Proctoring metric", "Observation"]],
    body: proctoringRows(input.proctoring),
    styles: { fontSize: 10 },
    columnStyles: { 1: { cellWidth: 330 } },
    headStyles: { fillColor: [190, 24, 93] },
    margin: { left: marginX, right: marginX },
  });
  // deno-lint-ignore no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 18;

  const events = input.proctoring?.events ?? [];
  if (events.length) {
    autoTable(doc, {
      startY: y,
      head: [["Time", "Flagged moment"]],
      body: events.slice(0, 60).map((e) => [
        new Date(e.at).toLocaleTimeString(),
        `${e.type}${e.detail ? `: ${e.detail}` : ""}`,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [120, 53, 15] },
      margin: { left: marginX, right: marginX },
    });
    // deno-lint-ignore no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 18;
  }

  if (input.transcript.length) {
    autoTable(doc, {
      startY: y,
      head: [["Speaker", "Response"]],
      body: input.transcript.map((t) => [t.role === "agent" ? "Interviewer" : input.candidateName, t.text]),
      styles: { fontSize: 9, cellWidth: "wrap" },
      columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 385 } },
      headStyles: { fillColor: [71, 85, 105] },
      margin: { left: marginX, right: marginX },
    });
  }

  const safe = input.candidateName.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "candidate";
  doc.save(`proctoring-report-${safe}.pdf`);
}
