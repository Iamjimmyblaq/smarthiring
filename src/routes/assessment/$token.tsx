import { createFileRoute } from "@tanstack/react-router";
import AssessmentRoom from "@/pages/AssessmentRoom";

export const Route = createFileRoute("/assessment/$token")({
  head: () => ({
    meta: [
      { title: 'Skills assessment — Talenval' },
      { name: "description", content: 'Take your invited Talenval skills assessment and submit your responses securely.' },
      { property: "og:title", content: 'Skills assessment — Talenval' },
      { property: "og:description", content: 'Take your invited Talenval skills assessment and submit your responses securely.' },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AssessmentRoom,
});
