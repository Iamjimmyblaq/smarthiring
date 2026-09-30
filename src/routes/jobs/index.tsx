import { createFileRoute } from "@tanstack/react-router";
import Jobs from "@/pages/Jobs";

export const Route = createFileRoute("/jobs/")({
  head: () => ({
    meta: [
      { title: 'Jobs dashboard — Talenval' },
      { name: "description", content: 'Manage open jobs and candidate applications in Talenval.' },
      { property: "og:title", content: 'Jobs dashboard — Talenval' },
      { property: "og:description", content: 'Manage open jobs and candidate applications in Talenval.' },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Jobs,
});
