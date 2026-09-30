import { createFileRoute } from "@tanstack/react-router";
import ApiDocs from "@/pages/ApiDocs";

export const Route = createFileRoute("/api-docs")({
  head: () => ({
    meta: [
      { title: 'API documentation — Talenval' },
      { name: "description", content: 'Read the Talenval API documentation for jobs, candidates, interviews and integrations.' },
      { property: "og:title", content: 'API documentation — Talenval' },
      { property: "og:description", content: 'Read the Talenval API documentation for jobs, candidates, interviews and integrations.' },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ApiDocs,
});
