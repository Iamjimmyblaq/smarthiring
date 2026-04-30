import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Menu, X } from "lucide-react";
import Logo from "@/components/Logo";

export default function MarketingNav() {
  const { pathname } = useLocation();
  const [authed, setAuthed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setAuthed(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  const links = [
    { to: "/#features", label: "Product" },
    { to: "/demo", label: "Demo" },
    { to: "/pricing", label: "Pricing" },
  ];

  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Link to="/" className="group">
          <Logo size={28} wordmarkClassName="text-foreground" />
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`hover:text-foreground transition-colors ${pathname === l.to ? "text-foreground" : ""}`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {authed ? (
            <Link to="/jobs"><Button size="sm" className="rounded-full bg-white text-background hover:bg-white/90">Open app</Button></Link>
          ) : (
            <>
              <Link to="/auth" className="text-sm font-medium text-muted-foreground hover:text-foreground">Login</Link>
              <Link to="/auth"><Button size="sm" className="rounded-full bg-white text-background hover:bg-white/90">Sign up</Button></Link>
            </>
          )}
        </div>

        <button className="md:hidden text-foreground" onClick={() => setOpen((v) => !v)} aria-label="Menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/5 bg-background/95 backdrop-blur-xl px-6 py-4 space-y-3">
          {links.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="block text-sm text-muted-foreground hover:text-foreground">
              {l.label}
            </Link>
          ))}
          <div className="pt-2 flex gap-3">
            {authed ? (
              <Link to="/jobs" className="flex-1"><Button className="w-full bg-white text-background">Open app</Button></Link>
            ) : (
              <>
                <Link to="/auth" className="flex-1"><Button variant="outline" className="w-full border-white/15 text-foreground bg-transparent">Login</Button></Link>
                <Link to="/auth" className="flex-1"><Button className="w-full bg-white text-background">Sign up</Button></Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}