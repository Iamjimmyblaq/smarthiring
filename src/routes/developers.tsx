import { createFileRoute } from "@tanstack/react-router";
import Developers from "@/pages/Developers";

export const Route = createFileRoute("/developers")({
  head: () => ({
    meta: [
      { title: 'Developer integrations — Talenval' },
      { name: "description", content: 'Connect Talenval to your hiring workflow with API keys, webhooks and embeddable tools.' },
      { property: "og:title", content: 'Developer integrations — Talenval' },
      { property: "og:description", content: 'Connect Talenval to your hiring workflow with API keys, webhooks and embeddable tools.' },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Developers,
});
