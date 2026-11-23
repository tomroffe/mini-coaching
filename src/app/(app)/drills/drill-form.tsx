"use client";

import { Save, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { DiagramEditor } from "@/components/diagram/diagram-editor";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { emptyDiagram, type Diagram } from "@/lib/diagram";
import { deleteDrill, saveDrill } from "./actions";

type DrillData = {
  id: string;
  title: string;
  category: string;
  ageGroups: string[];
  durationMin: number;
  minPlayers: number;
  area: string;
  equipment: string[];
  summary: string;
  setup: string;
  howToRun: string;
  coachingCues: string[];
  progressions: string[];
  regressions: string[];
  safetyNotes: string;
  tags: string[];
  diagram: Diagram | null;
};

const CATEGORIES = ["warm-up", "ball handling", "passing", "evasion", "tag", "support", "decision making", "scoring", "game", "skill"];

export function DrillForm({ drill, ageGroups, canDelete }: { drill?: DrillData; ageGroups: string[]; canDelete?: boolean }) {
  const [state, action, pending] = useActionState(saveDrill.bind(null, drill?.id ?? null), undefined);
  const [diagram, setDiagram] = useState<Diagram>(drill?.diagram ?? emptyDiagram());

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="diagram" value={JSON.stringify(diagram)} />

      <Card className="p-5">
        <h2 className="mb-1 font-semibold">Animated diagram</h2>
        <p className="mb-4 text-sm text-muted">Build the set-up, then add steps showing how the drill unfolds.</p>
        <DiagramEditor value={diagram} onChange={setDiagram} />
      </Card>

      <Card className="grid gap-4 p-5 md:grid-cols-2">
        <Field label="Title" className="md:col-span-2">
          <Input name="title" defaultValue={drill?.title} required placeholder="e.g. Cross the River" />
        </Field>
        <Field label="One-line summary" className="md:col-span-2">
          <Input name="summary" defaultValue={drill?.summary} placeholder="What is it, in a sentence?" />
        </Field>
        <Field label="Category">
          <Select name="category" defaultValue={drill?.category ?? "skill"}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </Field>
        <div className="space-y-1.5">
          <span className="text-sm font-medium">Age groups</span>
          <div className="flex flex-wrap gap-2">
            {ageGroups.map((a) => (
              <label key={a} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
                <input type="checkbox" name="ageGroups" value={a} defaultChecked={drill ? drill.ageGroups.includes(a) : ["U6", "U7", "U8"].includes(a)} className="accent-[var(--brand)]" />
                {a}
              </label>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Duration (min)"><Input name="durationMin" type="number" min={1} max={60} defaultValue={drill?.durationMin ?? 10} /></Field>
          <Field label="Min players"><Input name="minPlayers" type="number" min={1} max={30} defaultValue={drill?.minPlayers ?? 2} /></Field>
        </div>
        <Field label="Area"><Input name="area" defaultValue={drill?.area} placeholder="e.g. 15 x 10 m" /></Field>
        <Field label="Equipment" hint="Comma separated"><Input name="equipment" defaultValue={drill?.equipment.join(", ")} placeholder="cones, balls, tag belts" /></Field>
        <Field label="Tags" hint="Comma separated"><Input name="tags" defaultValue={drill?.tags.join(", ")} placeholder="evasion, warm-up" /></Field>
        <Field label="Set-up" className="md:col-span-2"><Textarea name="setup" defaultValue={drill?.setup} rows={2} /></Field>
        <Field label="How to run it" className="md:col-span-2"><Textarea name="howToRun" defaultValue={drill?.howToRun} rows={4} /></Field>
        <Field label="Coaching cues" hint="One per line"><Textarea name="coachingCues" defaultValue={drill?.coachingCues.join("\n")} rows={4} /></Field>
        <Field label="Progressions" hint="One per line"><Textarea name="progressions" defaultValue={drill?.progressions.join("\n")} rows={4} /></Field>
        <Field label="Regressions" hint="One per line: how to make it easier"><Textarea name="regressions" defaultValue={drill?.regressions.join("\n")} rows={3} /></Field>
        <Field label="Safety notes"><Textarea name="safetyNotes" defaultValue={drill?.safetyNotes} rows={3} /></Field>
      </Card>

      <div className="sticky bottom-20 z-20 flex items-center gap-3 rounded-2xl border border-border bg-surface/95 p-3 shadow-lg backdrop-blur lg:bottom-4">
        <Button disabled={pending}><Save className="size-4" /> {pending ? "Saving…" : "Save drill"}</Button>
        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        {drill && canDelete && (
          <Button
            type="button"
            variant="ghost"
            className="ml-auto text-danger"
            onClick={() => { if (window.confirm(`Delete "${drill.title}"? It will be removed from any session plans.`)) deleteDrill(drill.id); }}
          >
            <Trash2 className="size-4" /> Delete
          </Button>
        )}
      </div>
    </form>
  );
}
