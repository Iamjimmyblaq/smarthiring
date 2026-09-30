import { createFileRoute } from "@tanstack/react-router";
import InterviewRoom from "@/pages/InterviewRoom";

export const Route = createFileRoute("/interview/$token")({
  component: InterviewRoom,
});
