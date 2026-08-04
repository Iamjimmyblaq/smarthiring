import { Link } from "react-router-dom";
import { ArrowLeft, BadgeCheck, Bot, Sparkles, Users } from "lucide-react";
import hrDesk from "@/assets/hr-interview-desk.jpg";

const FEATURES = [
  { icon: Sparkles, text: "AI resume scoring with explainable results" },
  { icon: Users, text: "5-stage pipeline from sourced to hired" },
  { icon: BadgeCheck, text: "Automatic candidate status emails" },
];

/**
 * Product-selling showcase used on the authentication screen.
 * Renders on every breakpoint: a compact banner on mobile/tablet and the
 * full split-screen panel from large screens up.
 */
export default function AuthShowcase() {
  return (
    <aside className="relative flex flex-col justify-center gap-2 overflow-hidden border-b lg:border-b-0 lg:border-r bg-gradient-to-br from-primary/15 via-background to-accent/15 p-6 sm:p-8 lg:p-10">
      <div className="absolute -top-24 -right-24 size-56 sm:size-72 rounded-full bg-primary/20 blur-3xl" aria-hidden="true" />
      <div className="relative">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <h2 className="mt-5 lg:mt-8 text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight leading-tight">
          Every interview,<br className="hidden sm:block" /> intelligently run.
        </h2>
        <p className="mt-3 lg:mt-4 text-sm sm:text-base text-muted-foreground max-w-md">
          Screen, rank, interview and hire from one pipeline — with an AI interviewer that meets your
          candidates on video.
        </p>
      </div>

      <div className="relative my-6 lg:my-8">
        <img
          src={hrDesk}
          alt="Recruiter reviewing a candidate resume across the desk during an interview"
          width={1024}
          height={1024}
          loading="lazy"
          className="w-full rounded-2xl border shadow-lg object-cover max-h-[180px] sm:max-h-[260px] lg:max-h-[340px]"
        />
        <div className="absolute -bottom-4 left-4 flex items-center gap-2 rounded-xl border bg-card/90 backdrop-blur px-3 py-2 sm:px-4 sm:py-3 shadow-lg">
          <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          <div className="text-[11px] sm:text-xs">
            <p className="font-semibold">AI interviewer live</p>
            <p className="text-muted-foreground">Video · audio · proctored</p>
          </div>
        </div>
      </div>

      <ul className="relative grid gap-2 sm:gap-3 sm:grid-cols-2 lg:grid-cols-1 text-xs sm:text-sm">
        {FEATURES.map((f) => (
          <li key={f.text} className="flex items-center gap-3">
            <span className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <f.icon className="h-4 w-4" />
            </span>
            {f.text}
          </li>
        ))}
      </ul>
    </aside>
  );
}