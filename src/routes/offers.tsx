import { createFileRoute } from "@tanstack/react-router";
import Offers from "@/pages/Offers";

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { title: 'Offers — Talenval' },
      { name: "description", content: 'Manage candidate offers, approvals and hiring decisions in Talenval.' },
      { property: "og:title", content: 'Offers — Talenval' },
      { property: "og:description", content: 'Manage candidate offers, approvals and hiring decisions in Talenval.' },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Offers,
});
