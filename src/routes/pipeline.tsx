import { createFileRoute } from "@tanstack/react-router";
import Pipeline from "@/pages/Pipeline";

export const Route = createFileRoute("/pipeline")({
  component: Pipeline,
});
