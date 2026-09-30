import { createFileRoute } from "@tanstack/react-router";
import Offers from "@/pages/Offers";

export const Route = createFileRoute("/offers")({
  component: Offers,
});
