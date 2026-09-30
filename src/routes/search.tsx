import { createFileRoute } from "@tanstack/react-router";
import TalentSearch from "@/pages/TalentSearch";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Talent Search — Talenval" },
      { name: "description", content: "Search every candidate you have ever evaluated in plain English — scorecards, resumes, skills and hiring stages." },
      { property: "og:title", content: "Talent Search — Talenval" },
      { property: "og:description", content: "Ask Talenval in plain English and instantly surface past candidates worth revisiting." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TalentSearch,
});
