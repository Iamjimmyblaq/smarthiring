import { createFileRoute } from "@tanstack/react-router";
import PaymentVerify from "@/pages/PaymentVerify";

export const Route = createFileRoute("/payment/verify")({
  head: () => ({
    meta: [
      { title: 'Payment verification — Talenval' },
      { name: "description", content: 'Check the status of your Talenval subscription or credit purchase.' },
      { property: "og:title", content: 'Payment verification — Talenval' },
      { property: "og:description", content: 'Check the status of your Talenval subscription or credit purchase.' },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaymentVerify,
});
