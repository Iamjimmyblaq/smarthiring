import { createFileRoute } from "@tanstack/react-router";
import Assessments from "@/pages/Assessments";

export const Route = createFileRoute("/assessments")({
  head: () => ({
    meta: [
      { title: 'Skills assessments — Talenval' },
      { name: "description", content: 'Assign validated assessments, build custom tests and review candidate results in Talenval.' },
      { property: "og:title", content: 'Skills assessments — Talenval' },
      { property: "og:description", content: 'Assign validated assessments, build custom tests and review candidate results in Talenval.' },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Assessments,
});
