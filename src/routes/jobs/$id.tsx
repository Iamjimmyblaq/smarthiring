import { createFileRoute } from "@tanstack/react-router";
import JobDetail from "@/pages/JobDetail";

export const Route = createFileRoute("/jobs/$id")({
  head: () => ({
    meta: [
      { title: 'Job details — Talenval' },
      { name: "description", content: 'Review a Talenval role and its applicants, screening results and candidate pipeline.' },
      { property: "og:title", content: 'Job details — Talenval' },
      { property: "og:description", content: 'Review a Talenval role and its applicants, screening results and candidate pipeline.' },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: JobDetail,
});
