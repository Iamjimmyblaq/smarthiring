import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useConversation } from "@elevenlabs/react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Loader2, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import Logo from "@/components/Logo";

type SessionInfo = {
  id: string;
  status: string;
  candidate_name: string;
  job_title: string;
  job_description: string;
  required_skills: string[];
  company_name: string | null;
  expires_at: string;
};

type Turn = { role: "user" | "agent"; text: string; ts: number };

export default function InterviewRoom() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [done, setDone] = useState(false);
  const transcriptRef = useRef<Turn[]>([]);
  const [, force] = useState(0);

  const conversation = useConversation({
    onMessage: (msg: unknown) => {
      const m = msg as { source?: string; message?: string };
      if (m?.message) {
        const role: "user" | "agent" = m.source === "user" ? "user" : "agent";
        transcriptRef.current = [...transcriptRef.current, { role, text: m.message, ts: Date.now() }];
        force((n) => n + 1);
      }
    },
    onError: (e: unknown) => {
      console.error("ElevenLabs error", e);
      setError(typeof e === "string" ? e : "Voice connection error");
    },
  });

  useEffect(() => {
    document.title = "AI Interview — SmartHire";
    if (!token) return;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("get_interview_session_by_token", { _token: token });
        if (error) {
          console.error("Interview RPC error", error);
          setError(error.message || "This interview link is invalid or has expired.");
        } else if (!data || (data as unknown[]).length === 0) {
          setError("This interview link is invalid or has expired.");
        } else {
          setInfo((data as SessionInfo[])[0]);
        }
      } catch (e) {
        console.error("Interview load failed", e);
        setError(e instanceof Error ? e.message : "Failed to load interview");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const start = async () => {
    if (!token) return;
    setStarting(true);
    setError(null);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const { data, error } = await supabase.functions.invoke("elevenlabs-token", { body: { token } });
      if (error) throw error;
      if (!data?.conversationToken) throw new Error("No conversation token returned");
      await conversation.startSession({
        conversationToken: data.conversationToken,
        connectionType: "webrtc",
        overrides: data.overrides,
      });
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to start interview. Check your microphone permissions.");
    } finally {
      setStarting(false);
    }
  };

  const stop = async () => {
    setFinalizing(true);
    try {
      await conversation.endSession();
      const conversationId = conversation.getId?.();
      const { error } = await supabase.functions.invoke("interview-finalize", {
        body: { token, transcript: transcriptRef.current, conversationId },
      });
      if (error) throw error;
      setDone(true);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Could not finalize interview");
    } finally {
      setFinalizing(false);
    }
  };

  const status = conversation.status;
  const isConnected = status === "connected";
  const isSpeaking = conversation.isSpeaking;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10">
      <header className="border-b bg-card/60 backdrop-blur">
        <div className="container mx-auto py-4 flex items-center justify-between">
          <Logo size={28} wordmarkClassName="text-foreground" />
          <Badge variant="outline" className="gap-1"><Sparkles className="h-3 w-3 text-accent" /> AI Interview</Badge>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl py-10">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : error && !info ? (
          <Card><CardContent className="py-12 text-center space-y-2">
            <AlertCircle className="h-10 w-10 mx-auto text-destructive" />
            <p className="font-medium">{error}</p>
            <p className="text-sm text-muted-foreground">Please contact the recruiter for a fresh link.</p>
          </CardContent></Card>
        ) : done ? (
          <Card className="border-accent/40 bg-accent/5">
            <CardContent className="py-14 text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 mx-auto text-accent" />
              <h1 className="text-2xl font-semibold">Thank you, {info?.candidate_name}!</h1>
              <p className="text-muted-foreground max-w-md mx-auto">
                Your interview has been recorded and sent to the recruiter at {info?.company_name || "the company"}.
                You'll hear back by email about next steps.
              </p>
            </CardContent>
          </Card>
        ) : info ? (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">
                Hi {info.candidate_name}, ready for your AI interview?
              </CardTitle>
              <p className="text-muted-foreground">
                Position: <span className="font-medium text-foreground">{info.job_title}</span>
                {info.company_name ? <> at <span className="font-medium text-foreground">{info.company_name}</span></> : null}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isConnected && !starting && (
                <>
                  <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
                    <p className="text-sm font-medium">Before you start:</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                      <li>Find a quiet space with a stable internet connection.</li>
                      <li>Allow microphone access when your browser asks.</li>
                      <li>Speak naturally — the AI will ask follow-ups.</li>
                      <li>Expect the call to last 5–10 minutes.</li>
                    </ul>
                  </div>
                  <Button size="lg" className="w-full gap-2" onClick={start}>
                    <Mic className="h-5 w-5" /> Start interview
                  </Button>
                </>
              )}

              {starting && (
                <div className="flex flex-col items-center py-10 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                  <p className="text-sm text-muted-foreground">Connecting to your AI interviewer…</p>
                </div>
              )}

              {isConnected && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center py-8 gap-4">
                    <div className={`relative h-32 w-32 rounded-full flex items-center justify-center bg-gradient-to-br from-accent/30 to-primary/30 ${isSpeaking ? "ring-4 ring-accent/50 animate-pulse" : ""}`}>
                      <Mic className="h-12 w-12 text-accent" />
                    </div>
                    <Badge className={isSpeaking ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}>
                      {isSpeaking ? "Interviewer is speaking…" : "Listening to you…"}
                    </Badge>
                  </div>

                  <div className="max-h-64 overflow-y-auto rounded-lg border bg-muted/30 p-3 space-y-2 text-sm">
                    {transcriptRef.current.length === 0 && (
                      <p className="text-muted-foreground text-center py-4">Live transcript appears here…</p>
                    )}
                    {transcriptRef.current.map((t, i) => (
                      <div key={i} className={t.role === "agent" ? "text-foreground" : "text-muted-foreground italic"}>
                        <span className="font-medium">{t.role === "agent" ? "Interviewer" : "You"}:</span> {t.text}
                      </div>
                    ))}
                  </div>

                  <Button size="lg" variant="destructive" className="w-full gap-2" onClick={stop} disabled={finalizing}>
                    {finalizing ? <><Loader2 className="h-4 w-4 animate-spin" /> Finalizing…</> : <><MicOff className="h-5 w-5" /> End interview</>}
                  </Button>
                </div>
              )}

              {error && <p className="text-sm text-destructive text-center">{error}</p>}
            </CardContent>
          </Card>
        ) : null}
      </main>
    </div>
  );
}
