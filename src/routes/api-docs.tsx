import { createFileRoute } from "@tanstack/react-router";
import ApiDocs from "@/pages/ApiDocs";

export const Route = createFileRoute("/api-docs")({
  component: ApiDocs,
});
