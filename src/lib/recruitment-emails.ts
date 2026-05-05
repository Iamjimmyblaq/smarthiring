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
}

export interface GeneratedEmail {
  to: string;
  subject: string;
  body: string;
  mailto: string;
}

const firstName = (full: string) => (full || "").trim().split(/\s+/)[0] || "there";

export function generateDecisionEmail(
  kind: DecisionKind,
  ctx: EmailContext
): GeneratedEmail {
  const company = ctx.companyName?.trim() || "our team";
  const signoff = ctx.hrName?.trim() || (ctx.hrEmail ? ctx.hrEmail.split("@")[0] : "Hiring Team");

  const subject =
    kind === "interview"
      ? `Interview invitation — ${ctx.jobTitle} at ${company}`
      : `Update on your application — ${ctx.jobTitle} at ${company}`;

  const body =
    kind === "interview"
      ? `Hi ${firstName(ctx.candidateName)},

Thank you for taking the time to interview for the ${ctx.jobTitle} role at ${company}. We were really impressed with your background and would love to move you forward to the next stage.

Could you share a few times that work for you over the next week? We'll get something on the calendar right away.

Looking forward to speaking again soon.

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
  // Use location.href so the OS-default mail handler picks it up reliably.
  window.location.href = email.mailto;
}