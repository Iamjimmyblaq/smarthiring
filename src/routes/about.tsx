import { createFileRoute } from "@tanstack/react-router";
import About from "@/pages/About";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: 'About Talenval — Talenval' },
      { name: "description", content: 'Meet Talenval and learn how our talent evaluation platform helps teams hire with greater clarity.' },
      { property: "og:title", content: 'About Talenval — Talenval' },
      { property: "og:description", content: 'Meet Talenval and learn how our talent evaluation platform helps teams hire with greater clarity.' },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: About,
});
