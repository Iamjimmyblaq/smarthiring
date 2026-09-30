import { createFileRoute } from "@tanstack/react-router";
import Interviews from "@/pages/Interviews";

export const Route = createFileRoute("/interviews")({
  component: Interviews,
});
