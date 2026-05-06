// Generates interview/rejection email content and opens the HR's mail client
// via mailto: so they can review and hit send manually.

export type DecisionKind = "interview" | "rejection";

export interface EmailContext {
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  companyName?: string | null;
  hrEmail?: string | null;
  hrName?: string | null;
  scheduledAt?: string | null;
  durationMinutes?: number | null;
  interviewType?: string | null;
  interviewer?: string | null;
  location?: string | null;
  notes?: string | null;
}

export interface GeneratedEmail {
  to: string;
  subject: string;
  body: string;
  mailto: string;
}

const firstName = (full: string) => (full || "").trim().split(/\s+/)[0] || "there";

const formatDateTime = (value?: string | null) => {
  if (!value) return "the scheduled time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export function generateDecisionEmail(
  kind: DecisionKind,
  ctx: EmailContext
): GeneratedEmail {
  const company = ctx.companyName?.trim() || "our team";
  const signoff = ctx.hrName?.trim() || (ctx.hrEmail ? ctx.hrEmail.split("@")[0] : "Hiring Team");
  const interviewDate = formatDateTime(ctx.scheduledAt);
  const duration = ctx.durationMinutes ? `${ctx.durationMinutes} minutes` : "to be confirmed";
  const venue = ctx.location?.trim() || (ctx.interviewType ? `${ctx.interviewType} interview` : "to be confirmed");
  const interviewer = ctx.interviewer?.trim() || signoff;
  const notes = ctx.notes?.trim();

  const subject =
    kind === "interview"
      ? `Interview invitation — ${ctx.jobTitle} at ${company}`
      : `Update on your application — ${ctx.jobTitle} at ${company}`;

  const body =
    kind === "interview"
      ? `Hi ${firstName(ctx.candidateName)},

Thank you for your application for the ${ctx.jobTitle} role at ${company}. We were impressed with your background and would like to invite you for an interview.

Interview details:
Date and time: ${interviewDate}
Duration: ${duration}
Venue / format: ${venue}
Interviewer: ${interviewer}${notes ? `
Additional notes: ${notes}` : ""}

Please reply to confirm your availability for this interview.

Best,
${signoff}
${company}`
      : `Hi ${firstName(ctx.candidateName)},

Thank you for interviewing for the ${ctx.jobTitle} role at ${company} and for the time you invested in the process.

After careful consideration, we've decided to move forward with other candidates whose experience more closely matches what we're looking for at this stage. This was a difficult decision — your background is strong, and we genuinely appreciated getting to know you.

We'll keep your details on file and reach out if a more suitable role opens up. Wishing you the very best in your search.

Warm regards,
${signoff}
${company}`;

  // mailto: 'to' is the candidate; HR's app composes from their own account.
  const params = new URLSearchParams();
  params.set("subject", subject);
  params.set("body", body);
  const mailto = `mailto:${encodeURIComponent(ctx.candidateEmail)}?${params
    .toString()
    // URLSearchParams encodes spaces as '+' which mailto clients mishandle in body
    .replace(/\+/g, "%20")}`;

  return { to: ctx.candidateEmail, subject, body, mailto };
}

export function openInMailClient(email: GeneratedEmail) {
  // Trigger from a real anchor click so browsers can hand off to Gmail/Outlook/default mail apps.
  const anchor = document.createElement("a");
  anchor.href = email.mailto;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}