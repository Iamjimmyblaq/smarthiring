import { createFileRoute } from "@tanstack/react-router";
import ApplyJob from "@/pages/ApplyJob";

export const Route = createFileRoute("/apply/$jobId")({
  head: () => ({
    meta: [
      { title: "Apply for this role — Talenval" },
      { name: "description", content: "View this open role and apply in one click with your resume." },
      { property: "og:title", content: "We're hiring — apply now" },
      { property: "og:description", content: "View this open role and apply in one click with your resume." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ApplyJob,
});
