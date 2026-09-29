import { createFileRoute } from "@tanstack/react-router";
import Assessments from "@/pages/Assessments";

export const Route = createFileRoute("/assessments")({
  component: Assessments,
});
