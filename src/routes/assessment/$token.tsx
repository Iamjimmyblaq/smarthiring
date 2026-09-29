import { createFileRoute } from "@tanstack/react-router";
import AssessmentRoom from "@/pages/AssessmentRoom";

export const Route = createFileRoute("/assessment/$token")({
  component: AssessmentRoom,
});
