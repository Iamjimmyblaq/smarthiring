import { createFileRoute } from "@tanstack/react-router";
import AdminUserDetail from "@/pages/AdminUserDetail";

export const Route = createFileRoute("/admin/users/$id")({
  head: () => ({
    meta: [
      { title: 'User details — Talenval' },
      { name: "description", content: 'Review a Talenval team member, their account activity and subscription usage.' },
      { property: "og:title", content: 'User details — Talenval' },
      { property: "og:description", content: 'Review a Talenval team member, their account activity and subscription usage.' },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminUserDetail,
});
