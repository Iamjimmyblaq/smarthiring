import { createFileRoute } from "@tanstack/react-router";
import Developers from "@/pages/Developers";

export const Route = createFileRoute("/developers")({
  component: Developers,
});
