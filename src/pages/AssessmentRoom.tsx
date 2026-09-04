import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, Camera, Clock, Loader2, ShieldCheck } from "lucide-react";

interface Question { id: string; prompt: string; options: string[] }
interface TestInfo {
  title: string; category: string; skill_area: string; description: string | null;
  difficulty: string; duration_minutes: number; proctored: boolean;
}

interface ProctorEvent { at: string; type: string; detail?: string }

export default function AssessmentRoom() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [test, setTest] = useState<TestInfo | null>(null);
  const [candidateName, setCandidateName] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [started, setStarted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [result, setResult] = useState<{ percentage: number; score: number; max_score: number } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [cameraOn, setCameraOn] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevFrameRef = useRef<ImageData | null>(null);
  const motionTimerRef = useRef<number | null>(null);
  const questionShownAt = useRef<number>(Date.now());
  const timings = useRef<Record<string, number>>({});
  const startedAt = useRef<number>(0);

  const stats = useRef({
    tabSwitches: 0, windowBlurSeconds: 0, pasteAttempts: 0, copyAttempts: 0, rightClicks: 0,
    fullscreenExits: 0, motionSum: 0, motionSamples: 0, peakMotion: 0, highMotionEvents: 0,
    awayFromFrameEvents: 0, awayFromFrameSeconds: 0, events: [] as ProctorEvent[],
  });
  const blurAt = useRef<number | null>(null);
  const awaySince = useRef<number | null>(null);

  const logEvent = (type: string, detail?: string) => {
    stats.current.events.push({ at: new Date().toISOString(), type, detail });
  };

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const { data, error: fnErr } = await supabase.functions.invoke("skill-test-session", { body: { token } });
        if (fnErr) throw fnErr;
        if (data?.error) throw new Error(data.error);
        setTest(data.test);
        setCandidateName(data.candidate_name);
        setQuestions(data.questions ?? []);
        setSecondsLeft((data.test?.duration_minutes ?? 20) * 60);
      } catch (e) {
        setError(e instanceof Error ? e.message : "This assessment link could not be opened.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // Proctoring listeners are only armed while the test is running.
  useEffect(() => {
    if (!started || result) return;
    const onVisibility = () => {
      if (document.hidden) {
        stats.current.tabSwitches += 1;
        blurAt.current = Date.now();
        logEvent("tab_switch");
      } else if (blurAt.current) {
        stats.current.windowBlurSeconds += (Date.now() - blurAt.current) / 1000;
        blurAt.current = null;
      }
    };
    const onPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      stats.current.pasteAttempts += 1;
      logEvent("paste_blocked");
    };
    const onCopy = () => { stats.current.copyAttempts += 1; logEvent("copy_attempt"); };
    const onContext = (e: MouseEvent) => { e.preventDefault(); stats.current.rightClicks += 1; };
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("paste", onPaste);
    document.addEventListener("copy", onCopy);
    document.addEventListener("contextmenu", onContext);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("contextmenu", onContext);
    };
  }, [started, result]);

  const collectProctoring = useCallback(() => {
    const s = stats.current;
    if (blurAt.current) { s.windowBlurSeconds += (Date.now() - blurAt.current) / 1000; blurAt.current = null; }
    return {
      durationSeconds: startedAt.current ? (Date.now() - startedAt.current) / 1000 : 0,
      cameraEnabled: cameraOn,
      tabSwitches: s.tabSwitches,
      windowBlurSeconds: s.windowBlurSeconds,
      pasteAttempts: s.pasteAttempts,
      copyAttempts: s.copyAttempts,
      rightClicks: s.rightClicks,
      fullscreenExits: s.fullscreenExits,
      motionSamples: s.motionSamples,
      averageMotion: s.motionSamples ? s.motionSum / s.motionSamples : 0,
      peakMotion: s.peakMotion,
      highMotionEvents: s.highMotionEvents,
      awayFromFrameEvents: s.awayFromFrameEvents,
      awayFromFrameSeconds: s.awayFromFrameSeconds,
      events: s.events.slice(0, 200),
    };
  }, [cameraOn]);

  const releaseCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (motionTimerRef.current) window.clearInterval(motionTimerRef.current);
    motionTimerRef.current = null;
    setCameraOn(false);
  };

  const submit = useCallback(async (attempts = 3) => {
    if (!token) return;
    setSubmitting(true);
    setError(null);
    const proctoring = collectProctoring();
    const payload = questions.map((q) => ({
      question_id: q.id,
      selected: answers[q.id] ?? null,
      time_ms: timings.current[q.id] ?? null,
    }));
    releaseCamera();
    for (let i = 0; i < attempts; i++) {
      try {
        const { data, error: fnErr } = await supabase.functions.invoke("skill-test-submit", {
          body: { token, answers: payload, proctoring },
        });
        if (fnErr) throw fnErr;
        if (data?.error) throw new Error(data.error);
        setResult({ percentage: data.percentage, score: data.score, max_score: data.max_score });
        setSubmitFailed(false);
        setSubmitting(false);
        return;
      } catch (e) {
        console.error("submit attempt failed", i + 1, e);
        if (i < attempts - 1) await new Promise((r) => setTimeout(r, 1500 * Math.pow(2, i)));
        else setError(e instanceof Error ? e.message : "We could not submit your answers.");
      }
    }
    setSubmitFailed(true);
    setSubmitting(false);
  }, [answers, collectProctoring, questions, token]);

  // Countdown; auto-submits when the clock runs out.
  useEffect(() => {
    if (!started || result || submitting) return;
    if (secondsLeft <= 0) { submit(); return; }
    const t = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [started, secondsLeft, result, submitting, submit]);

  useEffect(() => () => releaseCamera(), []);

  const startTest = async () => {
    setStarting(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: false });
      streamRef.current = stream;
      setCameraOn(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      // Frame-difference monitoring: movement plus "no one in front of the camera".
      motionTimerRef.current = window.setInterval(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.videoWidth === 0) return;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        canvas.width = 96; canvas.height = 72;
        ctx.drawImage(video, 0, 0, 96, 72);
        const frame = ctx.getImageData(0, 0, 96, 72);
        const prev = prevFrameRef.current;
        if (prev) {
          let diff = 0;
          let bright = 0;
          for (let i = 0; i < frame.data.length; i += 16) {
            diff += Math.abs(frame.data[i] - prev.data[i]);
            bright += frame.data[i];
          }
          const samples = frame.data.length / 16;
          const motion = diff / samples;
          const luminance = bright / samples;
          const s = stats.current;
          s.motionSum += motion; s.motionSamples += 1;
          s.peakMotion = Math.max(s.peakMotion, motion);
          if (motion > 28) { s.highMotionEvents += 1; logEvent("high_movement", `motion ${Math.round(motion)}`); }
          const absent = motion < 1.2 || luminance < 18;
          if (absent && awaySince.current === null) {
            awaySince.current = Date.now();
          } else if (!absent && awaySince.current !== null) {
            const secs = (Date.now() - awaySince.current) / 1000;
            if (secs > 3) {
              s.awayFromFrameEvents += 1;
              s.awayFromFrameSeconds += secs;
              logEvent("left_camera_frame", `${Math.round(secs)}s`);
            }
            awaySince.current = null;
          }
        }
        prevFrameRef.current = frame;
      }, 1500);

      const { data, error: fnErr } = await supabase.functions.invoke("skill-test-session", { body: { token, start: true } });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      setQuestions(data.questions ?? []);
      startedAt.current = Date.now();
      questionShownAt.current = Date.now();
      setStarted(true);
    } catch (e) {
      releaseCamera();
      setError(e instanceof Error ? e.message : "We need camera access to run this proctored assessment.");
    } finally {
      setStarting(false);
    }
  };

  const choose = (qid: string, option: number) => {
    timings.current[qid] = Date.now() - questionShownAt.current;
    setAnswers((a) => ({ ...a, [qid]: option }));
  };

  const goto = (i: number) => { questionShownAt.current = Date.now(); setIndex(i); };

  const mmss = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;
  const answeredCount = Object.keys(answers).length;
  const q = questions[index];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10 select-none">
      <header className="border-b bg-card/60 backdrop-blur">
        <div className="container mx-auto py-4 flex items-center justify-between">
          <Logo size={28} wordmarkClassName="text-foreground" />
          <div className="flex items-center gap-2">
            {started && !result && (
              <Badge variant="outline" className="gap-1 font-mono"><Clock className="h-3 w-3" /> {mmss}</Badge>
            )}
            <Badge variant="outline" className="gap-1"><ShieldCheck className="h-3 w-3 text-accent" /> Proctored assessment</Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl py-10">
        {loading ? (
          <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : error && !test ? (
          <Card><CardContent className="py-14 text-center space-y-2">
            <AlertCircle className="h-10 w-10 mx-auto text-destructive" />
            <p className="font-medium">{error}</p>
            <p className="text-sm text-muted-foreground">Please contact the recruiter for a fresh link.</p>
          </CardContent></Card>
        ) : result ? (
          <Card className="border-accent/40 bg-accent/5">
            <CardContent className="py-14 text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 mx-auto text-accent" />
              <h1 className="text-2xl font-semibold">Thank you, {candidateName}!</h1>
              <p className="text-muted-foreground max-w-md mx-auto">
                Your answers and proctoring record have been sent to the hiring team. Your camera is now switched off
                and this assessment link is closed.
              </p>
              <p className="text-3xl font-bold">{result.score}/{result.max_score}</p>
            </CardContent>
          </Card>
        ) : submitFailed ? (
          <Card className="border-destructive/40">
            <CardContent className="py-14 text-center space-y-4">
              <AlertCircle className="h-10 w-10 mx-auto text-destructive" />
              <p className="font-medium">We could not submit your answers</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">{error} Your answers are still held in this window — press retry.</p>
              <Button onClick={() => submit()} disabled={submitting} className="gap-2">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Retrying…</> : "Retry submission"}
              </Button>
            </CardContent>
          </Card>
        ) : !started ? (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Hi {candidateName}, ready for your assessment?</CardTitle>
              <p className="text-muted-foreground">{test?.title}</p>
            </CardHeader>
            <CardContent className="space-y-5">
              {test?.description && <p className="text-sm text-muted-foreground">{test.description}</p>}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-sm">
                <div className="rounded-lg border p-3"><p className="text-xs uppercase text-muted-foreground">Questions</p><p className="font-semibold">{questions.length}</p></div>
                <div className="rounded-lg border p-3"><p className="text-xs uppercase text-muted-foreground">Time</p><p className="font-semibold">{test?.duration_minutes} min</p></div>
                <div className="rounded-lg border p-3"><p className="text-xs uppercase text-muted-foreground">Level</p><p className="font-semibold capitalize">{test?.difficulty}</p></div>
                <div className="rounded-lg border p-3"><p className="text-xs uppercase text-muted-foreground">Area</p><p className="font-semibold truncate">{test?.skill_area}</p></div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-1.5">
                <p className="font-medium flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Integrity rules</p>
                <p className="text-muted-foreground">Your webcam stays on and is monitored for movement and presence. Copy and paste are disabled, and tab switching is recorded. The timer cannot be paused, and the link works once only.</p>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button size="lg" className="w-full gap-2" onClick={startTest} disabled={starting}>
                {starting ? <><Loader2 className="h-4 w-4 animate-spin" /> Preparing…</> : <><Camera className="h-5 w-5" /> Enable camera &amp; start</>}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardContent className="py-4 flex items-center gap-4">
                <div className="relative shrink-0">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-36 rounded-md border bg-muted aspect-video object-cover"
                  />
                  <span className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-medium">
                    <span className={`h-1.5 w-1.5 rounded-full ${cameraOn ? "bg-destructive animate-pulse" : "bg-muted-foreground"}`} />
                    {cameraOn ? "Recording" : "Camera off"}
                  </span>
                </div>

                <canvas ref={canvasRef} className="hidden" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{test?.title}</p>
                  <p className="text-xs text-muted-foreground">Question {index + 1} of {questions.length} · {answeredCount} answered</p>
                  <Progress value={(answeredCount / Math.max(1, questions.length)) * 100} className="mt-2 h-2" />
                </div>
                <Badge variant={secondsLeft < 60 ? "destructive" : "outline"} className="font-mono">{mmss}</Badge>
              </CardContent>
            </Card>

            {q && (
              <Card>
                <CardHeader><CardTitle className="text-lg leading-relaxed">{q.prompt}</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {q.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => choose(q.id, i)}
                      className={`w-full text-left rounded-lg border px-4 py-3 text-sm transition-colors ${
                        answers[q.id] === i ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted/50"
                      }`}
                    >
                      <span className="text-muted-foreground mr-2">{String.fromCharCode(65 + i)}.</span>{opt}
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-1 flex-wrap">
                {questions.map((qq, i) => (
                  <button
                    key={qq.id}
                    onClick={() => goto(i)}
                    className={`h-8 w-8 rounded-md border text-xs ${
                      i === index ? "border-primary bg-primary text-primary-foreground"
                      : answers[qq.id] !== undefined ? "bg-accent/20 border-accent/40" : "hover:bg-muted"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => goto(Math.max(0, index - 1))} disabled={index === 0}>Previous</Button>
                {index < questions.length - 1 ? (
                  <Button onClick={() => goto(index + 1)}>Next</Button>
                ) : (
                  <Button onClick={() => submit()} disabled={submitting} className="gap-2">
                    {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : "Submit assessment"}
                  </Button>
                )}
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}
      </main>
    </div>
  );
}
