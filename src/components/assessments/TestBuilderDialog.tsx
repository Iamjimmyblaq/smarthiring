import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Wand2 } from "lucide-react";

interface DraftQuestion {
  prompt: string;
  options: string[];
  correct: number;
  points: number;
  explanation: string;
}

const emptyQuestion = (): DraftQuestion => ({ prompt: "", options: ["", "", "", ""], correct: 0, points: 1, explanation: "" });

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "custom-test";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

/** Lets L&D specialists author a tailored, proctored assessment for their own company. */
export default function TestBuilderDialog({ open, onOpenChange, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [skillArea, setSkillArea] = useState("");
  const [category, setCategory] = useState("role_specific");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [duration, setDuration] = useState(30);
  const [description, setDescription] = useState("");
  const [proctored, setProctored] = useState(true);
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion()]);
  const [saving, setSaving] = useState(false);

  const patch = (i: number, p: Partial<DraftQuestion>) =>
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, ...p } : q)));

  const patchOption = (i: number, oi: number, value: string) =>
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, options: q.options.map((o, k) => (k === oi ? value : o)) } : q)));

  const reset = () => {
    setTitle(""); setSkillArea(""); setCategory("role_specific"); setDifficulty("intermediate");
    setDuration(30); setDescription(""); setProctored(true); setQuestions([emptyQuestion()]);
  };

  const save = async () => {
    if (!title.trim()) return toast.error("Give your assessment a title");
    if (!skillArea.trim()) return toast.error("Add the skill area this test measures");
    const clean = questions.filter((q) => q.prompt.trim());
    if (clean.length === 0) return toast.error("Add at least one question");
    for (const q of clean) {
      const opts = q.options.filter((o) => o.trim());
      if (opts.length < 2) return toast.error(`"${q.prompt.slice(0, 30)}…" needs at least two answer options`);
      if (!q.options[q.correct]?.trim()) return toast.error("Every question needs a correct answer selected");
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("You need to be signed in");

      const { data: test, error } = await supabase
        .from("skill_tests")
        .insert({
          slug: `${slugify(title)}-${Date.now().toString(36)}`,
          title: title.trim(),
          category,
          skill_area: skillArea.trim(),
          description: description.trim() || null,
          difficulty,
          duration_minutes: Number(duration) || 30,
          question_count: clean.length,
          proctored,
          tags: ["custom", skillArea.trim().toLowerCase()],
          is_active: true,
          is_custom: true,
          created_by: uid,
        })
        .select("id")
        .single();
      if (error) throw error;

      const rows = clean.map((q, i) => ({
        test_id: test.id,
        position: i + 1,
        prompt: q.prompt.trim(),
        question_type: "multiple_choice",
        options: q.options.filter((o) => o.trim()),
        correct_option: q.correct,
        explanation: q.explanation.trim() || null,
        points: Number(q.points) || 1,
      }));
      const { error: qErr } = await supabase.from("skill_test_questions").insert(rows);
      if (qErr) throw qErr;

      toast.success(`"${title.trim()}" is ready to send to candidates`);
      reset();
      onOpenChange(false);
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save this assessment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Wand2 className="h-4 w-4" /> Build a tailored assessment</DialogTitle>
          <DialogDescription>
            For learning &amp; development teams: author your own company-specific test. It stays private to your
            account and can be sent to candidates or employees exactly like the standard library tests.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tb-title">Assessment title</Label>
              <Input id="tb-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Internal safety induction" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tb-area">Skill area</Label>
              <Input id="tb-area" value={skillArea} onChange={(e) => setSkillArea(e.target.value)} placeholder="HSE compliance" />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="role_specific">Role-specific</SelectItem>
                  <SelectItem value="coding">Coding</SelectItem>
                  <SelectItem value="language">Language proficiency</SelectItem>
                  <SelectItem value="cognitive">Cognitive ability</SelectItem>
                  <SelectItem value="situational">Situational judgement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tb-duration">Duration (minutes)</Label>
              <Input id="tb-duration" type="number" min={5} max={180} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch id="tb-proctored" checked={proctored} onCheckedChange={setProctored} />
              <Label htmlFor="tb-proctored">Webcam proctoring &amp; paste blocking</Label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tb-desc">Description</Label>
            <Textarea id="tb-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="What this assessment measures and who should take it." />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">Questions ({questions.length})</h3>
              <Button size="sm" variant="outline" className="gap-2" onClick={() => setQuestions((p) => [...p, emptyQuestion()])}>
                <Plus className="h-4 w-4" /> Add question
              </Button>
            </div>

            {questions.map((q, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-muted-foreground pt-2.5 w-6">{i + 1}.</span>
                    <Textarea
                      rows={2}
                      value={q.prompt}
                      onChange={(e) => patch(i, { prompt: e.target.value })}
                      placeholder="Question prompt"
                      aria-label={`Question ${i + 1} prompt`}
                    />
                    {questions.length > 1 && (
                      <Button size="icon" variant="ghost" aria-label={`Remove question ${i + 1}`}
                        onClick={() => setQuestions((p) => p.filter((_, k) => k !== i))}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {q.options.map((o, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${i}`}
                          checked={q.correct === oi}
                          onChange={() => patch(i, { correct: oi })}
                          aria-label={`Mark option ${oi + 1} correct for question ${i + 1}`}
                        />
                        <Input value={o} onChange={(e) => patchOption(i, oi, e.target.value)}
                          placeholder={`Option ${oi + 1}`} aria-label={`Question ${i + 1} option ${oi + 1}`} />
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Points</Label>
                      <Input type="number" min={1} value={q.points} onChange={(e) => patch(i, { points: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Explanation (optional)</Label>
                      <Input value={q.explanation} onChange={(e) => patch(i, { explanation: e.target.value })}
                        placeholder="Shown in the scored report" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><Wand2 className="h-4 w-4" /> Save assessment</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
