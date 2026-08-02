import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import MarketingNav from "@/components/marketing/MarketingNav";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

const faqs = [
  { q: "What does SmartHire actually do?", a: "SmartHire screens and scores resumes with AI, runs proctored AI video interviews, and manages your whole pipeline from sourced through screening, interview, offer and hired — with automatic candidate emails at every stage." },
  { q: "How does the AI resume scoring work?", a: "You define a job with required skills and minimum experience. Every uploaded resume is parsed and scored on skills, experience and education, with matched skills, gaps and a written summary so you can compare candidates objectively." },
  { q: "What is an AI video interview?", a: "It is a live, interactive session: the candidate's camera and microphone are on and they share their screen while the AI asks questions in audio. The camera feed is used to detect the candidate leaving frame, which discourages malpractice. Afterwards you get a transcript, per-skill scores and a recommendation." },
  { q: "Do candidates need an account?", a: "No. Candidates get a secure, expiring interview link and join straight from the browser." },
  { q: "Which emails are sent automatically?", a: "Stage-change notifications (screening, interview, offer, hired), interview invitations with date, time and venue or meeting link, and AI interview completion reports to the recruiter. Emails are queued with retries and logged so failures are visible." },
  { q: "Can I use my company's own email address?", a: "Yes. Set your company name and HR email on the job, and candidate emails are sent with your HR address as the reply-to so responses land in your inbox." },
  { q: "What plans are available?", a: "Basic, Pro, Pro Max and Enterprise. Each plan has its own limits on resume uploads, active jobs and AI interviews. Limits and pricing are configured by the SmartHire admin and shown live on the pricing page." },
  { q: "Can I integrate SmartHire with my own careers site?", a: "Yes. The public REST API lets you create jobs, submit candidates, move stages and start AI interviews. Jobs posted through the API appear on your SmartHire board automatically, with deduplication via external_id. Webhooks push events back to your system." },
  { q: "Is my data secure?", a: "Every record is isolated per account with row-level security, API keys are stored hashed, and webhook deliveries are signed with HMAC-SHA256." },
  { q: "How do I get support?", a: "Email help.smarthire@gmail.com. Pro Max and Enterprise plans include priority support." },
];

export default function FAQ() {
  return (
    <main className="min-h-screen bg-background">
      <Helmet>
        <title>FAQ — SmartHire AI Recruitment Questions Answered</title>
        <meta name="description" content="Answers to common SmartHire questions: AI resume scoring, proctored AI video interviews, automatic candidate emails, pricing tiers and API integration." />
        <link rel="canonical" href="https://smarthiring.lovable.app/faq" />
        <meta property="og:title" content="SmartHire FAQ" />
        <meta property="og:description" content="How SmartHire's AI screening, interviews, plans and API work." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        })}</script>
      </Helmet>
      <MarketingNav />

      <section className="pt-32 pb-20 px-6">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest text-center">FAQ</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-center">Frequently asked questions</h1>
          <p className="mt-4 text-muted-foreground text-center">Everything about screening, interviews, plans and integrations.</p>

          <Accordion type="single" collapsible className="mt-10">
            {faqs.map((f) => (
              <AccordionItem key={f.q} value={f.q}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-12 text-center">
            <p className="text-muted-foreground">Still stuck? We reply fast.</p>
            <div className="mt-4 flex justify-center gap-3">
              <a href="mailto:help.smarthire@gmail.com"><Button className="rounded-xl px-8">Email support</Button></a>
              <Link to="/api-docs"><Button variant="outline" className="rounded-xl px-8">API docs</Button></Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
