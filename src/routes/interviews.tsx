import { createFileRoute } from "@tanstack/react-router";
import Interviews from "@/pages/Interviews";

export const Route = createFileRoute("/interviews")({
  head: () => ({
    meta: [
      { title: 'AI interviews — Talenval' },
      { name: "description", content: 'Schedule and review AI video interviews, candidate transcripts and proctoring reports.' },
      { property: "og:title", content: 'AI interviews — Talenval' },
      { property: "og:description", content: 'Schedule and review AI video interviews, candidate transcripts and proctoring reports.' },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Interviews,
});
