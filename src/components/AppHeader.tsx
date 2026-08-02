import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LogOut } from "lucide-react";
import Logo from "@/components/Logo";
import { useIsAdmin } from "@/hooks/useIsAdmin";

export default function AppHeader() {
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();
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
        <Link to="/jobs" className="shrink-0">
          <Logo size={28} wordmarkClassName="text-foreground" />
        </Link>
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
        <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    </header>
  );
}