"use client";

import { AnimatePresence, motion, Reorder, useDragControls } from "framer-motion";
import { Droplets, GripVertical, Minus, Plus, Save, Search, Shapes, Trash2, X, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { DrillDiagram } from "@/components/diagram/drill-diagram";
import { TimelineBar } from "@/components/plan/timeline-bar";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { BLOCK_TYPES } from "@/lib/curriculum";
import type { Diagram } from "@/lib/diagram";
import { addMinutes, cn } from "@/lib/utils";
import { deletePlan, savePlan, type PlanInput } from "../../actions";

type DrillLite = { id: string; title: string; category: string; durationMin: number; coachingCues: string[]; ageGroups: string[]; diagram: Diagram | null };
type Block = PlanInput["blocks"][number] & { key: string };
type Plan = Omit<PlanInput, "blocks"> & { id: string };

let k = 0;
const key = () => `b${++k}-${Date.now()}`;

export function PlanBuilder({ plan, blocks: initial, drills, ageGroups }: { plan: Plan; blocks: PlanInput["blocks"]; drills: DrillLite[]; ageGroups: { id: string; code: string }[] }) {
  const router = useRouter();
  const [meta, setMeta] = useState(plan);
  const [blocks, setBlocks] = useState<Block[]>(() => initial.map((b) => ({ ...b, key: key() })));
  const [picker, setPicker] = useState<{ target: string | "new" } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [dirty, setDirty] = useState(false);

  const drillById = useMemo(() => new Map(drills.map((d) => [d.id, d])), [drills]);
  const total = blocks.reduce((s, b) => s + b.durationMin, 0);

  const upd = (k: string, patch: Partial<Block>) => {
    setBlocks((bs) => bs.map((b) => (b.key === k ? { ...b, ...patch } : b)));
    setDirty(true);
  };
  const setM = (patch: Partial<Plan>) => {
    setMeta((m) => ({ ...m, ...patch }));
    setDirty(true);
  };

  function pickDrill(d: DrillLite) {
    if (!picker) return;
    if (picker.target === "new") {
      setBlocks((bs) => [...bs, { key: key(), durationMin: d.durationMin, blockType: d.category === "game" ? "game" : "skill", drillId: d.id, customTitle: "", coachFocus: d.coachingCues.join("; ") }]);
    } else {
      const b = blocks.find((x) => x.key === picker.target);
      upd(picker.target, { drillId: d.id, coachFocus: b?.coachFocus || d.coachingCues.join("; ") });
    }
    setDirty(true);
    setPicker(null);
  }

  function save() {
    setError(null);
    startSave(async () => {
      const res = await savePlan(plan.id, { ...meta, blocks: blocks.map(({ key: _k, ...b }) => b) });
      if (res.error) setError(res.error);
      else {
        setDirty(false);
        router.push(`/sessions/${plan.id}`);
      }
    });
  }

  let t = 0;
  return (
    <div className="space-y-6">
      <Card className="grid gap-4 p-5 md:grid-cols-6">
        <Field label="Title" className="md:col-span-4"><Input value={meta.title} onChange={(e) => setM({ title: e.target.value })} /></Field>
        <Field label="Age group" className="md:col-span-1">
          <Select value={meta.ageGroupId ?? ""} onChange={(e) => setM({ ageGroupId: e.target.value || null })}>
            <option value="">–</option>
            {ageGroups.map((g) => <option key={g.id} value={g.id}>{g.code}</option>)}
          </Select>
        </Field>
        <Field label="Start" className="md:col-span-1"><Input type="time" value={meta.startTime} onChange={(e) => setM({ startTime: e.target.value })} /></Field>
        <Field label="Theme / period" className="md:col-span-2"><Input value={meta.theme} onChange={(e) => setM({ theme: e.target.value })} placeholder="e.g. Beat the defender" /></Field>
        <Field label="Session outcome" className="md:col-span-4"><Input value={meta.outcome} onChange={(e) => setM({ outcome: e.target.value })} placeholder="What should players be able to do by the end?" /></Field>
      </Card>

      <div className="sticky top-14 z-20 -mx-1 rounded-2xl bg-bg/90 px-1 py-2 backdrop-blur lg:top-0">
        <TimelineBar startTime={meta.startTime} blocks={blocks.map((b) => ({ durationMin: b.durationMin, blockType: b.blockType, title: b.customTitle || drillById.get(b.drillId ?? "")?.title || "Activity" }))} />
        {total !== 45 && <p className="mt-1 text-xs text-amber-600">Total is {total} min (the standard session is 45).</p>}
      </div>

      <Reorder.Group axis="y" values={blocks} onReorder={(v) => { setBlocks(v); setDirty(true); }} className="space-y-3">
        <AnimatePresence initial={false}>
          {blocks.map((b) => {
            const start = addMinutes(meta.startTime, t);
            t += b.durationMin;
            return (
              <BlockRow
                key={b.key}
                block={b}
                start={start}
                drill={b.drillId ? drillById.get(b.drillId) : undefined}
                onChange={(p) => upd(b.key, p)}
                onRemove={() => { setBlocks((bs) => bs.filter((x) => x.key !== b.key)); setDirty(true); }}
                onPick={() => setPicker({ target: b.key })}
              />
            );
          })}
        </AnimatePresence>
      </Reorder.Group>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setPicker({ target: "new" })}><Shapes className="size-4" /> Add drill from library</Button>
        <Button
          variant="ghost"
          onClick={() => { setBlocks((bs) => [...bs, { key: key(), durationMin: 2, blockType: "water", drillId: null, customTitle: "Water break", coachFocus: "" }]); setDirty(true); }}
        >
          <Droplets className="size-4" /> Add water break
        </Button>
        <Button
          variant="ghost"
          onClick={() => { setBlocks((bs) => [...bs, { key: key(), durationMin: 4, blockType: "challenge", drillId: null, customTitle: "Challenge", coachFocus: "" }]); setDirty(true); }}
        >
          <Zap className="size-4" /> Add challenge
        </Button>
      </div>

      <Card className="grid gap-4 p-5 md:grid-cols-2">
        <Field label="Equipment"><Textarea value={meta.equipment} onChange={(e) => setM({ equipment: e.target.value })} rows={2} /></Field>
        <Field label="Checkpoint" hint="What to observe / record this week"><Textarea value={meta.checkpoint} onChange={(e) => setM({ checkpoint: e.target.value })} rows={2} /></Field>
        <Field label="Notes" className="md:col-span-2"><Textarea value={meta.notes} onChange={(e) => setM({ notes: e.target.value })} rows={3} /></Field>
      </Card>

      <div className="sticky bottom-20 z-20 flex items-center gap-3 rounded-2xl border border-border bg-surface/95 p-3 shadow-lg backdrop-blur lg:bottom-4">
        <Button onClick={save} disabled={saving}><Save className="size-4" /> {saving ? "Saving…" : "Save plan"}</Button>
        <Button variant="ghost" onClick={() => router.push(`/sessions/${plan.id}`)}>Cancel</Button>
        {dirty && <span className="text-xs text-muted">Unsaved changes</span>}
        {error && <span className="text-sm text-danger">{error}</span>}
        <Button variant="ghost" className="ml-auto text-danger" onClick={() => { if (window.confirm("Delete this plan? Weeks using it will become unplanned.")) deletePlan(plan.id); }}>
          <Trash2 className="size-4" /> Delete
        </Button>
      </div>

      <AnimatePresence>{picker && <DrillPicker drills={drills} onPick={pickDrill} onClose={() => setPicker(null)} />}</AnimatePresence>
    </div>
  );
}

function BlockRow({ block: b, start, drill, onChange, onRemove, onPick }: { block: Block; start: string; drill?: DrillLite; onChange: (p: Partial<Block>) => void; onRemove: () => void; onPick: () => void }) {
  const controls = useDragControls();
  const type = BLOCK_TYPES.find((x) => x.value === b.blockType)!;
  return (
    <Reorder.Item
      value={b}
      dragListener={false}
      dragControls={controls}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginTop: 0 }}
      className="list-none"
    >
      <Card className="overflow-hidden">
        <div className="flex">
          <div className="w-1.5 shrink-0" style={{ background: type.colour }} />
          <button
            type="button"
            onPointerDown={(e) => controls.start(e)}
            className="flex w-8 shrink-0 cursor-grab touch-none items-center justify-center text-muted hover:text-text active:cursor-grabbing"
            aria-label="Drag to reorder"
          >
            <GripVertical className="size-4" />
          </button>
          <div className="grid flex-1 gap-3 p-3 pl-1 md:grid-cols-[9rem_1fr_9rem]">
            {b.blockType === "water" ? (
              <div className="hidden aspect-[3/2] items-center justify-center rounded-lg bg-sky-500/10 text-sky-500 md:flex">
                <Droplets className="size-8" />
              </div>
            ) : drill?.diagram ? (
              <button type="button" onClick={onPick} className="hidden overflow-hidden rounded-lg md:block" title="Change drill">
                <DrillDiagram diagram={drill.diagram} chromeless hoverPlay />
              </button>
            ) : (
              <button type="button" onClick={onPick} className="hidden aspect-[3/2] items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted hover:text-text md:flex">
                + Choose drill
              </button>
            )}
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted tabular-nums">{start}</span>
                <input
                  value={b.customTitle}
                  onChange={(e) => onChange({ customTitle: e.target.value })}
                  placeholder={drill?.title ?? "Block title"}
                  className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-0.5 font-semibold hover:border-border focus:border-brand focus:outline-none"
                />
              </div>
              {b.blockType !== "water" && (
                <button type="button" onClick={onPick} className="text-xs text-brand hover:underline">
                  {drill ? `Drill: ${drill.title} (change)` : "Link a drill from the library"}
                </button>
              )}
              {drill && (
                <button type="button" onClick={() => onChange({ drillId: null })} className="ml-2 text-xs text-muted hover:text-danger">unlink</button>
              )}
              <textarea
                value={b.coachFocus}
                onChange={(e) => onChange({ coachFocus: e.target.value })}
                placeholder="Coach focus for this block…"
                rows={2}
                className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm focus:border-brand focus:outline-none"
              />
            </div>
            <div className="flex items-start gap-2 md:flex-col md:items-end">
              <select
                value={b.blockType}
                onChange={(e) => onChange({ blockType: e.target.value as Block["blockType"] })}
                className="h-8 rounded-lg border border-border bg-surface px-2 text-xs"
                style={{ color: type.colour }}
              >
                {BLOCK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <div className="flex items-center rounded-lg border border-border">
                <button type="button" aria-label="Less time" onClick={() => onChange({ durationMin: Math.max(1, b.durationMin - 1) })} className="p-1.5 text-muted hover:text-text"><Minus className="size-3.5" /></button>
                <span className="w-12 text-center text-sm font-semibold tabular-nums">{b.durationMin}′</span>
                <button type="button" aria-label="More time" onClick={() => onChange({ durationMin: Math.min(60, b.durationMin + 1) })} className="p-1.5 text-muted hover:text-text"><Plus className="size-3.5" /></button>
              </div>
              <button type="button" onClick={onRemove} className="rounded-lg p-1.5 text-muted hover:text-danger md:mt-auto" aria-label="Remove block"><Trash2 className="size-4" /></button>
            </div>
          </div>
        </div>
      </Card>
    </Reorder.Item>
  );
}

function DrillPicker({ drills, onPick, onClose }: { drills: DrillLite[]; onPick: (d: DrillLite) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const list = drills.filter((d) => !q || (d.title + " " + d.category).toLowerCase().includes(q.toLowerCase()));
  return (
    <motion.div className="fixed inset-0 z-50 flex justify-end bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.aside
        className="flex h-full w-full max-w-md flex-col bg-surface shadow-2xl"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 38 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border p-4">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search drills…" className="pl-9" />
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted hover:text-text" aria-label="Close"><X className="size-5" /></button>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {list.map((d) => (
            <button key={d.id} onClick={() => onPick(d)} className={cn("flex w-full gap-3 rounded-xl border border-border p-2 text-left transition hover:border-brand hover:bg-brand-soft")}>
              <div className="w-28 shrink-0 overflow-hidden rounded-lg">{d.diagram && <DrillDiagram diagram={d.diagram} chromeless />}</div>
              <div className="min-w-0">
                <div className="font-semibold">{d.title}</div>
                <div className="text-xs text-muted capitalize">{d.category} · {d.durationMin} min · {d.ageGroups.join(", ")}</div>
              </div>
            </button>
          ))}
        </div>
      </motion.aside>
    </motion.div>
  );
}
