import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";

interface BackButtonProps {
  /** Where to land when there is no history to go back to. */
  fallback?: string;
  label?: string;
  className?: string;
}

/**
 * Universal back control: returns to the previous page when there is history,
 * otherwise falls back to the home page.
 */
export default function BackButton({ fallback = "/", label = "Back", className }: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const canGoBack = typeof window !== "undefined" && window.history.length > 1 && location.key !== "default";

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`gap-1.5 ${className ?? ""}`}
      onClick={() => (canGoBack ? navigate(-1) : navigate(fallback))}
      aria-label={canGoBack ? "Go back to the previous page" : "Go to the home page"}
    >
      {canGoBack ? <ArrowLeft className="h-4 w-4" /> : <Home className="h-4 w-4" />}
      <span className="hidden sm:inline">{canGoBack ? label : "Home"}</span>
    </Button>
  );
}
