import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Reads and updates the signed-in recruiter's blind-screening preference. */
export function useBlindMode() {
  const [blind, setBlind] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { setLoading(false); return; }
      const { data: profile } = await supabase
        .from("profiles")
        .select("blind_mode")
        .eq("id", data.user.id)
        .maybeSingle();
      setBlind(Boolean(profile?.blind_mode));
      setLoading(false);
    })();
  }, []);

  const toggle = useCallback(async (next: boolean) => {
    setBlind(next);
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await supabase.from("profiles").update({ blind_mode: next }).eq("id", data.user.id);
  }, []);

  return { blind, loading, toggle };
}
