import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Loader2, Sparkles, CheckCircle2, AlertCircle, Send, Video, ScreenShare } from "lucide-react";
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

type ProctorEvent = { at: string; type: string; detail?: string };

interface ProctorState {
  startedAt: number;
  motionSamples: number;
  motionTotal: number;
  peakMotion: number;
  highMotionEvents: number;
  awayFromFrameEvents: number;
  awayFromFrameSeconds: number;
  awaySince: number | null;
  tabSwitches: number;
  windowBlurSeconds: number;
  blurSince: number | null;
  screenShareStops: number;
  events: ProctorEvent[];
}

const newProctorState = (): ProctorState => ({
  startedAt: Date.now(),
  motionSamples: 0,
  motionTotal: 0,
  peakMotion: 0,
  highMotionEvents: 0,
  awayFromFrameEvents: 0,
  awayFromFrameSeconds: 0,
  awaySince: null,
  tabSwitches: 0,
  windowBlurSeconds: 0,
  blurSince: null,
  screenShareStops: 0,
  events: [],
});

async function getFunctionErrorMessage(error: unknown, fallback: string) {
  if (error instanceof FunctionsHttpError) {
    const details = await error.context.json().catch(() => null) as { error?: string } | null;
    return details?.error || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

export default function InterviewRoom() {
  return (
    <ConversationProvider>
      <InterviewRoomContent />
    </ConversationProvider>
  );
}

function InterviewRoomContent() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [done, setDone] = useState(false);
  const [finalizeFailed, setFinalizeFailed] = useState(false);
  const [reportWarning, setReportWarning] = useState<string | null>(null);
  const [textMode, setTextMode] = useState(false);
  const [answer, setAnswer] = useState("");
  const [sendingAnswer, setSendingAnswer] = useState(false);
  const [textComplete, setTextComplete] = useState(false);
  const transcriptRef = useRef<Turn[]>([]);
  const [, force] = useState(0);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const [avReady, setAvReady] = useState(false);
  const [screenShareOn, setScreenShareOn] = useState(false);
  const proctorRef = useRef<ProctorState | null>(null);
  const motionTimerRef = useRef<number | null>(null);
  const lastFrameRef = useRef<Uint8ClampedArray | null>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const logEvent = (type: string, detail?: string) => {
    const p = proctorRef.current;
    if (!p) return;
    if (p.events.length < 100) p.events.push({ at: new Date().toISOString(), type, detail });
  };

  /** Samples the webcam every second and measures frame-to-frame movement. */
  const startProctoring = () => {
    proctorRef.current = newProctorState();
    const canvas = analysisCanvasRef.current ?? document.createElement("canvas");
    analysisCanvasRef.current = canvas;
    canvas.width = 64;
    canvas.height = 48;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    motionTimerRef.current = window.setInterval(() => {
      const p = proctorRef.current;
      const video = cameraVideoRef.current;
      if (!p || !ctx || !video || video.readyState < 2) return;
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let brightness = 0;
        for (let i = 0; i < frame.length; i += 4) brightness += (frame[i] + frame[i + 1] + frame[i + 2]) / 3;
        brightness /= frame.length / 4;

        const prev = lastFrameRef.current;
        if (prev) {
          let diff = 0;
          for (let i = 0; i < frame.length; i += 4) diff += Math.abs(frame[i] - prev[i]);
          const motion = diff / (frame.length / 4);
          p.motionSamples += 1;
          p.motionTotal += motion;
          if (motion > p.peakMotion) p.peakMotion = motion;
          if (motion > 28) {
            p.highMotionEvents += 1;
            logEvent("high_movement", `motion score ${Math.round(motion)}`);
          }
        }
        lastFrameRef.current = frame.slice(0) as unknown as Uint8ClampedArray;

        const away = brightness < 18;
        if (away && p.awaySince === null) {
          p.awaySince = Date.now();
          p.awayFromFrameEvents += 1;
          logEvent("left_frame", "camera view dark or obstructed");
        } else if (!away && p.awaySince !== null) {
          p.awayFromFrameSeconds += (Date.now() - p.awaySince) / 1000;
          p.awaySince = null;
        }
      } catch { /* frame not readable yet */ }
    }, 1000);
  };

  const stopProctoring = (): Record<string, unknown> | null => {
    if (motionTimerRef.current) { clearInterval(motionTimerRef.current); motionTimerRef.current = null; }
    const p = proctorRef.current;
    if (!p) return null;
    if (p.awaySince !== null) { p.awayFromFrameSeconds += (Date.now() - p.awaySince) / 1000; p.awaySince = null; }
    if (p.blurSince !== null) { p.windowBlurSeconds += (Date.now() - p.blurSince) / 1000; p.blurSince = null; }
    return {
      durationSeconds: (Date.now() - p.startedAt) / 1000,
      cameraEnabled: Boolean(cameraStreamRef.current),
      screenShared: screenShareOn || p.screenShareStops > 0,
      screenShareStops: p.screenShareStops,
      tabSwitches: p.tabSwitches,
      windowBlurSeconds: p.windowBlurSeconds,
      motionSamples: p.motionSamples,
      averageMotion: p.motionSamples ? p.motionTotal / p.motionSamples : 0,
      peakMotion: p.peakMotion,
      highMotionEvents: p.highMotionEvents,
      awayFromFrameEvents: p.awayFromFrameEvents,
      awayFromFrameSeconds: p.awayFromFrameSeconds,
      events: p.events,
    };
  };

  // Attention tracking: tab/window switches while the interview is live.
  useEffect(() => {
    const onVisibility = () => {
      const p = proctorRef.current;
      if (!p) return;
      if (document.hidden) {
        p.tabSwitches += 1;
        p.blurSince = Date.now();
        logEvent("tab_switch", "candidate left the interview tab");
      } else if (p.blurSince !== null) {
        p.windowBlurSeconds += (Date.now() - p.blurSince) / 1000;
        p.blurSince = null;
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

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
        const { data, error } = await supabase.functions.invoke("get-interview-session", {
          body: { token },
        });
        if (error || !data || (data as { error?: string }).error) {
          const msg = (data as { error?: string } | null)?.error || await getFunctionErrorMessage(error, "This interview link is invalid or has expired.");
          console.error("Interview session load error", msg);
          setError(msg);
        } else {
          setInfo(data as SessionInfo);
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
      // Interactive video interview: require camera+mic and screen share for proctoring.
      const camStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { width: 640, height: 480 } });
      cameraStreamRef.current = camStream;
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = camStream;
        await cameraVideoRef.current.play().catch(() => {});
      }
      try {
        // deno-lint-ignore no-explicit-any
        const display = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: false });
        screenStreamRef.current = display;
        setScreenShareOn(true);
        display.getVideoTracks()[0]?.addEventListener("ended", () => {
          setScreenShareOn(false);
          if (proctorRef.current) {
            proctorRef.current.screenShareStops += 1;
            logEvent("screen_share_stopped", "candidate stopped sharing their screen");
          }
        });
      } catch (e) {
        console.warn("Screen share declined:", e);
      }
      setAvReady(true);
      startProctoring();

      const { data, error } = await supabase.functions.invoke("elevenlabs-token", { body: { token } });
      if (error) throw new Error(await getFunctionErrorMessage(error, "Could not start the AI interview."));
      if (data?.conversationToken) {
        await conversation.startSession({
          conversationToken: data.conversationToken,
          connectionType: "webrtc",
          overrides: data.overrides,
        });
      } else if (data?.signedUrl) {
        await conversation.startSession({
          signedUrl: data.signedUrl,
          overrides: data.overrides,
        });
      } else if (data?.fallbackMode === "text_ai") {
        const { data: turnData, error: turnError } = await supabase.functions.invoke("ai-interview-turn", {
          body: { token, transcript: transcriptRef.current },
        });
        if (turnError) throw new Error(await getFunctionErrorMessage(turnError, "Could not start the AI interview."));
        transcriptRef.current = [...transcriptRef.current, { role: "agent", text: turnData?.message || "Hello, let's begin your interview.", ts: Date.now() }];
        setTextComplete(Boolean(turnData?.complete));
        setTextMode(true);
        force((n) => n + 1);
      } else if (data?.agentId) {
        await conversation.startSession({
          agentId: data.agentId,
          connectionType: "webrtc",
          overrides: data.overrides,
        });
      } else {
        throw new Error("No interview agent was returned. Please ask the recruiter to regenerate the link.");
      }
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to start interview. Check your camera, microphone, and screen-share permissions.");
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null; screenStreamRef.current = null; setAvReady(false); setScreenShareOn(false);
    } finally {
      setStarting(false);
    }
  };

  const sendAnswer = async () => {
    const text = answer.trim();
    if (!token || !text || sendingAnswer || textComplete) return;
    setSendingAnswer(true);
    setError(null);
    const nextTranscript = [...transcriptRef.current, { role: "user" as const, text, ts: Date.now() }];
    transcriptRef.current = nextTranscript;
    setAnswer("");
    force((n) => n + 1);
    try {
      const { data, error } = await supabase.functions.invoke("ai-interview-turn", {
        body: { token, transcript: nextTranscript },
      });
      if (error) throw new Error(await getFunctionErrorMessage(error, "The AI interviewer could not respond."));
      transcriptRef.current = [...nextTranscript, { role: "agent", text: data?.message || "Thank you. Please continue.", ts: Date.now() }];
      setTextComplete(Boolean(data?.complete));
      force((n) => n + 1);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "The AI interviewer could not respond.");
    } finally {
      setSendingAnswer(false);
    }
  };

  const proctoringRef = useRef<Record<string, unknown> | null>(null);

  const releaseDevices = () => {
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null;
    cameraStreamRef.current = null; screenStreamRef.current = null;
    setAvReady(false); setScreenShareOn(false); setTextMode(false);
  };

  /** Finalize with up to 3 attempts and exponential backoff before surfacing a retry button. */
  const finalize = async (attempts = 3) => {
    setFinalizing(true);
    setError(null);
    let lastError: unknown = null;
    for (let i = 0; i < attempts; i++) {
      try {
        const conversationId = conversation.getId?.();
        const { data, error } = await supabase.functions.invoke("interview-finalize", {
          body: { token, transcript: transcriptRef.current, conversationId, proctoring: proctoringRef.current },
        });
        if (error) throw error;
        setReportWarning(data?.reportEmailed === false ? (data?.reportEmailError || "The recruiter report email could not be delivered yet — it has been queued for automatic retry.") : null);
        setFinalizeFailed(false);
        setDone(true);
        setFinalizing(false);
        return;
      } catch (e) {
        lastError = e;
        console.error("finalize attempt failed", i + 1, e);
        if (i < attempts - 1) await new Promise((r) => setTimeout(r, 1500 * Math.pow(2, i)));
      }
    }
    setFinalizeFailed(true);
    setError(
      lastError instanceof Error
        ? `We could not submit your interview report (${lastError.message}). Your answers are safe — press retry.`
        : "We could not submit your interview report. Your answers are safe — press retry.",
    );
    setFinalizing(false);
  };

  const stop = async () => {
    proctoringRef.current = proctoringRef.current ?? stopProctoring();
    try { await conversation.endSession(); } catch (e) { console.error("endSession failed", e); }
    // Hard stop every capture device: camera, mic and screen share.
    releaseDevices();
    await finalize();
  };

  useEffect(() => () => {
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    if (motionTimerRef.current) clearInterval(motionTimerRef.current);
  }, []);

  // Safety net: if the candidate closes or reloads the tab without pressing
  // "End interview", still submit the transcript so HR always gets the report.
  useEffect(() => {
    const handler = () => {
      if (doneRef.current || !startedRef.current) return;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/interview-finalize`;
      const body = JSON.stringify({
        token,
        transcript: transcriptRef.current,
        proctoring: proctoringRef.current ?? stopProctoring(),
        abandoned: true,
      });
      try {
        fetch(url, {
          method: "POST",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
          body,
        });
      } catch { /* best effort */ }
    };
    window.addEventListener("pagehide", handler);
    return () => window.removeEventListener("pagehide", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);


  // Once finalized, the link is dead — close the interview window automatically.
  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(() => {
      window.close();
      // If the browser blocks window.close() (tab wasn't script-opened), the
      // confirmation screen stays up with a manual close prompt.
    }, 6000);
    return () => clearTimeout(t);
  }, [done]);

  const status = conversation.status;
  const isConnected = status === "connected" || textMode;
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
        ) : finalizeFailed ? (
          <Card className="border-destructive/40">
            <CardContent className="py-12 text-center space-y-4">
              <AlertCircle className="h-10 w-10 mx-auto text-destructive" />
              <h1 className="text-xl font-semibold">Submission failed</h1>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">{error}</p>
              <p className="text-xs text-muted-foreground">
                Your camera, microphone and screen sharing are already off. Retrying only re-sends the report.
              </p>
              <Button onClick={() => finalize()} disabled={finalizing} className="gap-2">
                {finalizing ? <><Loader2 className="h-4 w-4 animate-spin" /> Retrying…</> : <>Retry submission</>}
              </Button>
            </CardContent>
          </Card>
        ) : done ? (
          <Card className="border-accent/40 bg-accent/5">
            <CardContent className="py-14 text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 mx-auto text-accent" />
              <h1 className="text-2xl font-semibold">Thank you, {info?.candidate_name}!</h1>
              <p className="text-muted-foreground max-w-md mx-auto">
                Your camera, microphone and screen sharing have been switched off. Your interview
                report has been sent to the recruiter at {info?.company_name || "the company"} and
                you'll hear back by email about next steps.
              </p>
              <p className="text-xs text-muted-foreground">
                This interview link is now closed and can no longer be used. This window will close automatically.
              </p>
              {reportWarning && (
                <p className="text-xs text-muted-foreground max-w-md mx-auto">{reportWarning}</p>
              )}
              <Button variant="outline" size="sm" onClick={() => window.close()}>Close window</Button>
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
                      <li>Allow <strong>camera, microphone and screen sharing</strong> when your browser asks — required for proctoring.</li>
                      <li>The AI will speak to you in audio; answer naturally.</li>
                      <li>Keep your face visible; leaving the frame may be flagged.</li>
                      <li>Expect the call to last 5–10 minutes.</li>
                    </ul>
                  </div>
                  <Button size="lg" className="w-full gap-2" onClick={start}>
                    <Video className="h-5 w-5" /> Start video interview
                  </Button>
                </>
              )}

              {starting && (
                <div className="flex flex-col items-center py-10 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                  <p className="text-sm text-muted-foreground">Connecting to your AI interviewer…</p>
                </div>
              )}

              {isConnected && !textMode && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
                      <video ref={cameraVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                      <Badge className="absolute top-2 left-2 bg-red-600 text-white gap-1"><Video className="h-3 w-3"/>You</Badge>
                    </div>
                    <div className="relative aspect-video rounded-lg bg-muted flex items-center justify-center">
                      {screenShareOn ? (
                        <Badge className="bg-accent text-accent-foreground gap-1"><ScreenShare className="h-3 w-3"/>Screen shared</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground text-center px-2">Screen share not active</span>
                      )}
                    </div>
                  </div>
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

              {textMode && (
                <div className="space-y-4">
                  <div className="max-h-96 overflow-y-auto rounded-lg border bg-muted/30 p-3 space-y-3 text-sm">
                    {transcriptRef.current.map((t, i) => (
                      <div key={i} className={t.role === "agent" ? "text-foreground" : "text-muted-foreground italic"}>
                        <span className="font-medium">{t.role === "agent" ? "Interviewer" : "You"}:</span> {t.text}
                      </div>
                    ))}
                    {sendingAnswer && <p className="text-muted-foreground">Interviewer is typing…</p>}
                  </div>

                  {!textComplete ? (
                    <div className="space-y-3">
                      <Textarea
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        placeholder="Type your answer here"
                        rows={4}
                      />
                      <Button size="lg" className="w-full gap-2" onClick={sendAnswer} disabled={!answer.trim() || sendingAnswer}>
                        {sendingAnswer ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : <><Send className="h-5 w-5" /> Send answer</>}
                      </Button>
                    </div>
                  ) : (
                    <Button size="lg" className="w-full gap-2" onClick={stop} disabled={finalizing}>
                      {finalizing ? <><Loader2 className="h-4 w-4 animate-spin" /> Finalizing…</> : <><CheckCircle2 className="h-5 w-5" /> Submit interview</>}
                    </Button>
                  )}
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
