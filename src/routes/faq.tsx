import { createFileRoute } from "@tanstack/react-router";
import FAQ from "@/pages/FAQ";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: 'Frequently asked questions — Talenval' },
      { name: "description", content: 'Find answers about Talenval screening, interviews, assessments, billing and hiring tools.' },
      { property: "og:title", content: 'Frequently asked questions — Talenval' },
      { property: "og:description", content: 'Find answers about Talenval screening, interviews, assessments, billing and hiring tools.' },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FAQ,
});
