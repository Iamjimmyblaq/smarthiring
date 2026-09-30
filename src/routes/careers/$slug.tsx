import { createFileRoute } from "@tanstack/react-router";
import Careers from "@/pages/Careers";

export const Route = createFileRoute("/careers/$slug")({
  head: ({ params }) => {
    const name = params.slug.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
    const title = `Careers at ${name}`;
    const description = `Open roles at ${name}. Apply in one click — resume screening, assessments and interviews powered by Talenval.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: Careers,
});
