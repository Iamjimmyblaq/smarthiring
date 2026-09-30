import { createFileRoute } from "@tanstack/react-router";
import Pricing from "@/pages/Pricing";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: 'Plans and pricing — Talenval' },
      { name: "description", content: 'Compare Talenval plans, assessment allowances, interview limits and credit packs.' },
      { property: "og:title", content: 'Plans and pricing — Talenval' },
      { property: "og:description", content: 'Compare Talenval plans, assessment allowances, interview limits and credit packs.' },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Pricing,
});
