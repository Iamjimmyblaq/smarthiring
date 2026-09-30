import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";

const title = "Talenval — Hire with clarity";
const description = "Screen resumes, test real skills and run AI video interviews with explainable AI scores. Shortlist the right people in minutes.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});
