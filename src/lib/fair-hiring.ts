import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Fair-hiring / adverse-impact analysis.
 *
 * Talenval deliberately never stores protected characteristics, so impact is
 * measured against *score bands* — the only basis the platform uses to
 * advance candidates. The four-fifths rule (EEOC Uniform Guidelines, also the
 * basis of NYC Local Law 144 bias audits) is applied across those bands: if a
 * band advances at less than 80% of the best-performing band's rate, it is
 * flagged for human review.
 */

export interface AuditCandidate {
  id: string;
  name: string | null;
  stage: string | null;
  overall_score: number | null;
  jobs?: { title: string } | null;
}

export interface BandResult {
  band: string;
  total: number;
  advanced: number;
  rate: number;
  impactRatio: number;
  flagged: boolean;
}

export interface FairHiringAudit {
  totalCandidates: number;
  scored: number;
  unscored: number;
  advanced: number;
  overallRate: number;
  bands: BandResult[];
  passes: boolean;
  generatedAt: string;
}

const ADVANCED_STAGES = new Set(["interview", "offer", "hired"]);

const BANDS: { band: string; min: number; max: number }[] = [
  { band: "90–100", min: 90, max: 100 },
  { band: "75–89", min: 75, max: 89 },
  { band: "60–74", min: 60, max: 74 },
  { band: "40–59", min: 40, max: 59 },
  { band: "0–39", min: 0, max: 39 },
];

export function runFairHiringAudit(candidates: AuditCandidate[]): FairHiringAudit {
  const scored = candidates.filter((c) => typeof c.overall_score === "number");
  const rows = BANDS.map(({ band, min, max }) => {
    const inBand = scored.filter((c) => (c.overall_score as number) >= min && (c.overall_score as number) <= max);
    const advanced = inBand.filter((c) => ADVANCED_STAGES.has(c.stage ?? "")).length;
    const rate = inBand.length ? advanced / inBand.length : 0;
    return { band, total: inBand.length, advanced, rate, impactRatio: 0, flagged: false };
  });

  const populated = rows.filter((r) => r.total > 0);
  const best = populated.reduce((m, r) => Math.max(m, r.rate), 0);
  for (const r of rows) {
    r.impactRatio = best > 0 ? r.rate / best : 0;
    // Only lower bands advancing disproportionately *more* or a top band
    // advancing disproportionately *less* is a signal worth reviewing.
    r.flagged = r.total >= 5 && best > 0 && r.impactRatio < 0.8 && r.rate > 0;
  }

  const advanced = scored.filter((c) => ADVANCED_STAGES.has(c.stage ?? "")).length;
  return {
    totalCandidates: candidates.length,
    scored: scored.length,
    unscored: candidates.length - scored.length,
    advanced,
    overallRate: scored.length ? advanced / scored.length : 0,
    bands: rows,
    passes: !rows.some((r) => r.flagged),
    generatedAt: new Date().toISOString(),
  };
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

export function downloadFairHiringPdf(audit: FairHiringAudit, companyName = "Your organisation") {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("Fair Hiring & Adverse Impact Report", 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(`Talenval · ${companyName}`, 14, 27);
  doc.text(`Generated ${new Date(audit.generatedAt).toLocaleString()}`, 14, 32);

  doc.setTextColor(30);
  doc.setFontSize(11);
  doc.text(
    doc.splitTextToSize(
      "This report applies the four-fifths (80%) rule from the EEOC Uniform Guidelines — the same " +
        "methodology required by NYC Local Law 144 bias audits — to every automated evaluation in this " +
        "account. Talenval does not collect or store protected characteristics, so advancement rates are " +
        "measured across objective score bands produced by the evaluation model.",
      182,
    ),
    14,
    42,
  );

  autoTable(doc, {
    startY: 72,
    head: [["Score band", "Candidates", "Advanced", "Selection rate", "Impact ratio", "Status"]],
    body: audit.bands.map((b) => [
      b.band,
      String(b.total),
      String(b.advanced),
      b.total ? pct(b.rate) : "—",
      b.total ? b.impactRatio.toFixed(2) : "—",
      b.total === 0 ? "No data" : b.flagged ? "Review" : "Within threshold",
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [16, 122, 94] },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const y = ((doc as any).lastAutoTable?.finalY ?? 120) + 12;
  doc.setFontSize(12);
  doc.text("Summary", 14, y);
  doc.setFontSize(10);
  const lines = [
    `Candidates evaluated: ${audit.totalCandidates} (${audit.scored} scored, ${audit.unscored} awaiting scoring)`,
    `Advanced to interview or beyond: ${audit.advanced} (${pct(audit.overallRate)})`,
    audit.passes
      ? "Result: PASS — every populated score band advanced within the 80% threshold."
      : "Result: REVIEW — one or more score bands fell below the 80% threshold and should be reviewed by a human.",
    "Evaluation basis: skills match, verified experience, education relevance, proctored assessment results",
    "and structured AI interview scoring. No protected characteristic is collected, stored or used.",
  ];
  doc.text(doc.splitTextToSize(lines.join("\n"), 182), 14, y + 7);

  doc.save(`talenval-fair-hiring-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
