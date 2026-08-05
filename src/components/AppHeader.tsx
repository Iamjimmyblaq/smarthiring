import { useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LogOut } from "lucide-react";
import Logo from "@/components/Logo";
import BackButton from "@/components/BackButton";
import { useIsAdmin } from "@/hooks/useIsAdmin";

export default function AppHeader() {
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();

  // Track engagement: last activity + approximate location (from browser locale/timezone).
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      let location: string | null = null;
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const region = new Intl.Locale(navigator.language).maximize().region;
        const country = region
          ? new Intl.DisplayNames([navigator.language], { type: "region" }).of(region)
          : null;
        location = [tz, country].filter(Boolean).join(" · ") || null;
      } catch { /* locale APIs unavailable */ }
      await supabase
        .from("profiles")
        .update({ last_active_at: new Date().toISOString(), location })
        .eq("id", data.user.id);
    })();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };
  const items = [
    { to: "/jobs", label: "Jobs" },
    { to: "/pipeline", label: "Pipeline" },
    { to: "/interviews", label: "Interviews" },
    { to: "/offers", label: "Offers" },
    { to: "/onboarding", label: "Onboarding" },
    { to: "/developers", label: "Developers" },
  ];
  const navItems = isAdmin ? [...items, { to: "/admin", label: "Admin" }] : items;
  return (
    <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-10">
      <div className="container mx-auto flex items-center justify-between py-4 gap-6">
        <div className="flex items-center gap-2 shrink-0">
          <BackButton fallback="/" />
          <Link to="/jobs">
            <Logo size={28} wordmarkClassName="text-foreground" />
          </Link>
        </div>
        <nav className="hidden md:flex items-center gap-1 text-sm flex-1">
          {navItems.map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md transition-colors ${
                  isActive ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`
              }
            >
              {i.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="sm" asChild className="gap-2">
            <Link to="/"><HomeIcon className="h-4 w-4" /><span className="hidden sm:inline">Home</span></Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
            <LogOut className="h-4 w-4" /><span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}