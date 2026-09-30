import { createFileRoute } from "@tanstack/react-router";
import Onboarding from "@/pages/Onboarding";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: 'Onboarding — Talenval' },
      { name: "description", content: 'Track new-hire onboarding steps and progress in Talenval.' },
      { property: "og:title", content: 'Onboarding — Talenval' },
      { property: "og:description", content: 'Track new-hire onboarding steps and progress in Talenval.' },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Onboarding,
});
