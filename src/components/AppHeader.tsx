import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LogOut } from "lucide-react";
import Logo from "@/components/Logo";

export default function AppHeader() {
  const navigate = useNavigate();
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };
  return (
    <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-10">
      <div className="container mx-auto flex items-center justify-between py-4">
        <Link to="/jobs">
          <Logo size={28} wordmarkClassName="text-foreground" />
        </Link>
        <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    </header>
  );
}