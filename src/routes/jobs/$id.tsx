import { createFileRoute } from "@tanstack/react-router";
import JobDetail from "@/pages/JobDetail";

export const Route = createFileRoute("/jobs/$id")({
  component: JobDetail,
});
