import { createFileRoute } from "@tanstack/react-router";
import Auth from "@/pages/Auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: 'Sign in — Talenval' },
      { name: "description", content: 'Sign in to Talenval to manage candidates, assessments and AI interviews.' },
      { property: "og:title", content: 'Sign in — Talenval' },
      { property: "og:description", content: 'Sign in to Talenval to manage candidates, assessments and AI interviews.' },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Auth,
});
