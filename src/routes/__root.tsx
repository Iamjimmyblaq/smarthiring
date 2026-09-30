import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { HelmetProvider } from "react-helmet-async";

import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import NotFound from "@/pages/NotFound";

import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { name: "google-site-verification", content: "gkRwLsMwGv4svAGUi_qZwxB1Jfx1wBWO9SUGrCJVDOU" },
      { title: "Talenval — AI Talent Evaluation & Hiring" },
      {
        name: "description",
        content: "AI-powered resume screening that ranks every applicant in seconds.",
      },
      { name: "author", content: "Talenval" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Talenval — AI Talent Evaluation & Hiring" },
      {
        property: "og:description",
        content: "AI-powered resume screening that ranks every applicant in seconds.",
      },
      {
        property: "og:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/34a88e25-cbdd-487c-92bd-d6d184fa54f5",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Talenval — AI Talent Evaluation & Hiring" },
      {
        name: "twitter:description",
        content: "AI-powered resume screening that ranks every applicant in seconds.",
      },
      {
        name: "twitter:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/34a88e25-cbdd-487c-92bd-d6d184fa54f5",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:wght@400;500;700&display=swap" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Talenval",
          url: "https://smarthiring.lovable.app",
          description: "AI-powered resume screening that ranks every applicant in seconds.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Talenval",
          url: "https://smarthiring.lovable.app",
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: RootErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Outlet />
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

function RootErrorComponent({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  useEffect(() => {
    console.error(error);
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center text-card-foreground">
        <h1 className="mb-2 text-xl font-semibold text-foreground">This page didn't load</h1>
        <p className="mb-6 text-muted-foreground">
          Something went wrong on our end. You can try again or head back home.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
            onClick={() => {
              void router.invalidate();
              reset();
            }}
          >
            Try again
          </button>
          <a
            className="rounded-md border border-border bg-background px-4 py-2 text-foreground"
            href="/"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
