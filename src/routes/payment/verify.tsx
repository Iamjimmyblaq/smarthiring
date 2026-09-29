import { createFileRoute } from "@tanstack/react-router";
import PaymentVerify from "@/pages/PaymentVerify";

export const Route = createFileRoute("/payment/verify")({
  component: PaymentVerify,
});
