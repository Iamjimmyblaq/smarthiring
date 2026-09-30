import { createFileRoute } from "@tanstack/react-router";
import Admin from "@/pages/Admin";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: 'Admin console — Talenval' },
      { name: "description", content: 'Manage Talenval teams, roles, subscriptions and platform settings.' },
      { property: "og:title", content: 'Admin console — Talenval' },
      { property: "og:description", content: 'Manage Talenval teams, roles, subscriptions and platform settings.' },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Admin,
});
