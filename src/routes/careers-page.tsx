import { createFileRoute } from "@tanstack/react-router";
import CareersSettings from "@/pages/CareersSettings";

export const Route = createFileRoute("/careers-page")({
  head: () => ({
    meta: [
      { title: "Careers page — Talenval" },
      { name: "description", content: "Publish a branded public careers page and embed your open roles on any website." },
      { property: "og:title", content: "Careers page — Talenval" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:description", content: "Publish a branded public careers page and embed your open roles on any website." },
    ],
  }),
  component: CareersSettings,
});
