import { createFileRoute } from "@tanstack/react-router";
import InterviewRoom from "@/pages/InterviewRoom";

export const Route = createFileRoute("/interview/$token")({
  head: () => ({
    meta: [
      { title: 'AI interview room — Talenval' },
      { name: "description", content: 'Join your invited Talenval AI video interview securely.' },
      { property: "og:title", content: 'AI interview room — Talenval' },
      { property: "og:description", content: 'Join your invited Talenval AI video interview securely.' },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InterviewRoom,
});
