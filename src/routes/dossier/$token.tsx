import { createFileRoute } from "@tanstack/react-router";
import Dossier from "@/pages/Dossier";

export const Route = createFileRoute("/dossier/$token")({
  head: () => ({
    meta: [
      { title: "Candidate dossier — Talenval" },
      { name: "description", content: "A secure, read-only candidate evaluation dossier shared by a recruiter using Talenval." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Candidate dossier — Talenval" },
      { property: "og:description", content: "A secure, read-only candidate evaluation dossier shared by a recruiter using Talenval." },
    ],
  }),
  component: Dossier,
});
