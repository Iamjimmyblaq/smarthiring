import { createFileRoute } from "@tanstack/react-router";
import Demo from "@/pages/Demo";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: 'Interactive demo — Talenval' },
      { name: "description", content: 'Explore Talenval with sample candidates and explainable screening scores.' },
      { property: "og:title", content: 'Interactive demo — Talenval' },
      { property: "og:description", content: 'Explore Talenval with sample candidates and explainable screening scores.' },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Demo,
});
