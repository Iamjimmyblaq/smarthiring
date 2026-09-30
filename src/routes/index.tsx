import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";

const title = "Talenval — Hire smarter, not harder";
const description = "Screen resumes, rank candidates with explainable scores, run AI video interviews and skills assessments, and manage every hiring stage in Talenval.";

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
