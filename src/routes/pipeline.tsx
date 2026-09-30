import { createFileRoute } from "@tanstack/react-router";
import Pipeline from "@/pages/Pipeline";

export const Route = createFileRoute("/pipeline")({
  head: () => ({
    meta: [
      { title: 'Hiring pipeline — Talenval' },
      { name: "description", content: 'Move candidates from sourcing to hiring across Talenval’s five-stage pipeline.' },
      { property: "og:title", content: 'Hiring pipeline — Talenval' },
      { property: "og:description", content: 'Move candidates from sourcing to hiring across Talenval’s five-stage pipeline.' },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Pipeline,
});
