"use client";

import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Hand,
  MessageSquare,
  MoveRight,
  Pencil,
  Plus,
  Redo2,
  Spline,
  Trash2,
  Undo2,
  Wand2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  resolvePositions,
  TEAM_COLOURS,
  type Diagram,
  type Entity,
  type EntityKind,
  type Point,
  type TeamColour,
} from "@/lib/diagram";
import { cn } from "@/lib/utils";
import { DiagramSvg, EntityGlyph, svgPoint, TEAM_HEX } from "./diagram-svg";
import { DrillDiagram } from "./drill-diagram";

type Tool = "move" | "run" | "pass" | "callout" | "erase";

const snap = (v: number) => Math.round(v * 2) / 2;
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export function DiagramEditor({ value, onChange }: { value: Diagram; onChange: (d: Diagram) => void }) {
  const [step, setStep] = useState(0);
  const [tool, setTool] = useState<Tool>("move");
  const [selected, setSelected] = useState<string | null>(null);
  const [team, setTeam] = useState<TeamColour>("teal");
  const [arrowStart, setArrowStart] = useState<Point | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const history = useRef<{ past: Diagram[]; future: Diagram[] }>({ past: [], future: [] });

  const d = value;
  const cur = d.steps[step];

  /** Commit a change with undo history. */
  const commit = useCallback(
    (fn: (draft: Diagram) => void, record = true) => {
      const next = clone(d);
      fn(next);
      if (record) {
        history.current.past.push(clone(d));
        if (history.current.past.length > 60) history.current.past.shift();
        history.current.future = [];
      }
      onChange(next);
    },
    [d, onChange],
  );

  const undo = useCallback(() => {
    const prev = history.current.past.pop();
    if (!prev) return;
    history.current.future.push(clone(d));
    onChange(prev);
    setStep((s) => Math.min(s, prev.steps.length - 1));
  }, [d, onChange]);
  const redo = useCallback(() => {
    const nxt = history.current.future.pop();
    if (!nxt) return;
    history.current.past.push(clone(d));
    onChange(nxt);
  }, [d, onChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selected) {
        e.preventDefault();
        removeEntity(selected);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ── entities ────────────────────────────────────────────────────────────
  function addEntity(kind: EntityKind) {
    const n = d.entities.filter((e) => e.kind === kind).length + 1;
    const id = `${kind[0]}${n}-${Math.random().toString(36).slice(2, 6)}`;
    const ent: Entity = { id, kind, ...(kind === "attacker" || kind === "defender" ? { team: kind === "defender" && team === "teal" ? "coral" : team } : {}) };
    commit((x) => {
      x.entities.push(ent);
      x.steps[step].positions[id] = { x: snap(x.pitch.w / 2 + (Math.random() - 0.5) * 2), y: snap(x.pitch.h / 2 + (Math.random() - 0.5) * 2) };
    });
    setSelected(id);
    setTool("move");
  }

  function removeEntity(id: string) {
    commit((x) => {
      x.entities = x.entities.filter((e) => e.id !== id);
      x.steps.forEach((s) => {
        delete s.positions[id];
        s.hidden = s.hidden.filter((h) => h !== id);
      });
    });
    setSelected(null);
  }

  function updateEntity(id: string, patch: Partial<Entity>) {
    commit((x) => {
      const e = x.entities.find((e) => e.id === id);
      if (e) Object.assign(e, patch);
    });
  }

  function toggleHidden(id: string) {
    commit((x) => {
      const h = new Set(x.steps[step].hidden);
      if (h.has(id)) h.delete(id); else h.add(id);
      x.steps[step].hidden = [...h];
    });
  }

  // ── dragging ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      if (!svgRef.current) return;
      const p = svgPoint(svgRef.current, e.clientX, e.clientY);
      const pt = { x: snap(Math.max(-1, Math.min(d.pitch.w + 1, p.x))), y: snap(Math.max(-1, Math.min(d.pitch.h + 1, p.y))) };
      const curPos = resolvePositions(d, step)[dragging];
      if (curPos && curPos.x === pt.x && curPos.y === pt.y) return;
      commit((x) => { x.steps[step].positions[dragging] = pt; }, false);
    };
    const up = () => setDragging(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging, d, step, commit]);

  function onEntityDown(e: React.PointerEvent, id: string) {
    if (tool === "erase") return removeEntity(id);
    if (tool === "run" || tool === "pass") {
      const p = resolvePositions(d, step)[id];
      return handleArrowPoint(p);
    }
    setSelected(id);
    if (tool === "move") {
      history.current.past.push(clone(d)); // one undo entry per drag
      history.current.future = [];
      setDragging(id);
    }
  }

  function handleArrowPoint(p: Point) {
    if (!arrowStart) return setArrowStart(p);
    if (Math.hypot(p.x - arrowStart.x, p.y - arrowStart.y) > 0.3) {
      commit((x) => { x.steps[step].arrows.push({ from: arrowStart, to: p, kind: tool === "pass" ? "pass" : "run", curve: 0 }); });
    }
    setArrowStart(null);
  }

  function onBackgroundDown(_: React.PointerEvent, raw: Point) {
    const p = { x: snap(raw.x), y: snap(raw.y) };
    if (tool === "run" || tool === "pass") return handleArrowPoint(p);
    if (tool === "callout") {
      const text = window.prompt("Callout text (e.g. TAG!, Try!)", "TAG!");
      if (text) commit((x) => { x.steps[step].callouts.push({ x: p.x, y: p.y, text: text.slice(0, 16) }); });
      return;
    }
    setSelected(null);
  }

  // ── steps ───────────────────────────────────────────────────────────────
  function addStep() {
    commit((x) => { x.steps.splice(step + 1, 0, { caption: "", positions: {}, hidden: [...x.steps[step].hidden], arrows: [], callouts: [] }); });
    setStep(step + 1);
  }
  function duplicateStep() {
    commit((x) => {
      const copy = clone(x.steps[step]);
      copy.positions = resolvePositions(x, step);
      x.steps.splice(step + 1, 0, copy);
    });
    setStep(step + 1);
  }
  function deleteStep() {
    if (d.steps.length < 2) return;
    commit((x) => {
      // keep later steps' carried-forward positions intact
      const resolvedNext = step + 1 < x.steps.length ? resolvePositions(x, step + 1) : null;
      x.steps.splice(step, 1);
      if (resolvedNext && x.steps[step]) x.steps[step].positions = { ...resolvedNext };
    });
    setStep(Math.max(0, step - 1));
  }
  function moveStep(dir: -1 | 1) {
    const j = step + dir;
    if (j < 1 || j >= d.steps.length || step === 0) return;
    commit((x) => {
      // freeze absolute positions so reordering keeps each frame intact
      const a = resolvePositions(x, step), b = resolvePositions(x, j);
      x.steps[step].positions = a;
      x.steps[j].positions = b;
      [x.steps[step], x.steps[j]] = [x.steps[j], x.steps[step]];
    });
    setStep(j);
  }
  /** Draw run arrows for every player that moved since the previous step. */
  function autoArrows() {
    if (step === 0) return;
    const before = resolvePositions(d, step - 1);
    const after = resolvePositions(d, step);
    commit((x) => {
      const s = x.steps[step];
      s.arrows = s.arrows.filter((a) => a.kind !== "run");
      for (const e of x.entities) {
        if (e.kind !== "attacker" && e.kind !== "defender" && e.kind !== "coach") continue;
        const a = before[e.id], b = after[e.id];
        if (a && b && Math.hypot(a.x - b.x, a.y - b.y) > 0.6) s.arrows.push({ from: a, to: b, kind: "run", curve: 0 });
      }
    });
  }
  function bendLastArrow() {
    if (!cur.arrows.length) return;
    commit((x) => {
      const a = x.steps[step].arrows.at(-1)!;
      a.curve = a.curve === 0 ? 1 : a.curve > 0 ? -1 : 0;
    });
  }

  const sel = d.entities.find((e) => e.id === selected);
  const selHidden = selected ? cur.hidden.includes(selected) : false;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-2/60 p-2">
        <div className="flex gap-1 rounded-lg bg-surface p-1">
          <ToolBtn active={tool === "move"} onClick={() => setTool("move")} label="Select & move"><Hand className="size-4" /></ToolBtn>
          <ToolBtn active={tool === "run"} onClick={() => { setTool("run"); setArrowStart(null); }} label="Run arrow (click start, then end)"><MoveRight className="size-4" /></ToolBtn>
          <ToolBtn active={tool === "pass"} onClick={() => { setTool("pass"); setArrowStart(null); }} label="Pass arrow (dashed)"><ArrowRight className="size-4 [stroke-dasharray:3_3]" /></ToolBtn>
          <ToolBtn active={tool === "callout"} onClick={() => setTool("callout")} label="Callout bubble"><MessageSquare className="size-4" /></ToolBtn>
          <ToolBtn active={tool === "erase"} onClick={() => setTool("erase")} label="Erase (click item or arrow)"><Trash2 className="size-4" /></ToolBtn>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-surface p-1">
          {(["attacker", "defender", "coach", "ball", "cone", "tag"] as EntityKind[]).map((k) => (
            <button key={k} type="button" onClick={() => addEntity(k)} title={`Add ${k}`} aria-label={`Add ${k}`} className="flex flex-col items-center rounded-md px-1.5 py-1 text-[10px] text-muted hover:bg-surface-2 hover:text-text">
              <svg width="28" height="28" viewBox="-20 -20 40 40"><EntityGlyph e={{ kind: k, team: k === "attacker" ? team : k === "defender" ? (team === "teal" ? "coral" : team) : undefined }} /></svg>
              <span className="capitalize">{k}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1" title="Team colour for new players">
          {TEAM_COLOURS.map((c) => (
            <button key={c} type="button" aria-label={c} onClick={() => setTeam(c)} className={cn("size-5 rounded-full ring-offset-2 ring-offset-surface", team === c && "ring-2 ring-text")} style={{ background: TEAM_HEX[c] }} />
          ))}
        </div>
        <div className="ml-auto flex gap-1">
          <ToolBtn onClick={undo} label="Undo (⌘Z)"><Undo2 className="size-4" /></ToolBtn>
          <ToolBtn onClick={redo} label="Redo (⇧⌘Z)"><Redo2 className="size-4" /></ToolBtn>
          <button type="button" onClick={() => setPreview((p) => !p)} className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 text-sm font-medium", preview ? "bg-brand text-brand-fg" : "bg-surface")}>
            {preview ? <Pencil className="size-4" /> : <Eye className="size-4" />} {preview ? "Edit" : "Preview"}
          </button>
        </div>
      </div>

      {preview ? (
        <DrillDiagram diagram={d} autoPlay />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_15rem]">
          <div className="relative">
            <DiagramSvg
              svgRef={svgRef}
              diagram={d}
              step={step}
              animate={!dragging}
              selectedId={selected}
              onEntityPointerDown={onEntityDown}
              onBackgroundPointerDown={onBackgroundDown}
              onArrowClick={tool === "erase" ? (i) => commit((x) => { x.steps[step].arrows.splice(i, 1); }) : undefined}
              className={cn("block h-auto w-full select-none rounded-2xl", tool !== "move" && "cursor-crosshair")}
            />
            {arrowStart && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                Now click where the {tool} ends
              </div>
            )}
          </div>

          {/* Inspector */}
          <div className="space-y-3 text-sm">
            <div className="rounded-xl border border-border p-3">
              <div className="mb-2 font-semibold">Pitch</div>
              <div className="grid grid-cols-2 gap-2">
                <NumField label="Width (m)" value={d.pitch.w} onChange={(v) => commit((x) => { x.pitch.w = v; })} />
                <NumField label="Length (m)" value={d.pitch.h} onChange={(v) => commit((x) => { x.pitch.h = v; })} />
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                <MiniBtn onClick={() => commit((x) => { x.pitch.gridEvery = x.pitch.gridEvery ? undefined : 2.5; })}>{d.pitch.gridEvery ? "Hide" : "Show"} grid</MiniBtn>
                <MiniBtn onClick={() => commit((x) => { x.pitch.zones.push({ x: x.pitch.w - 2, y: 0, w: 2, h: x.pitch.h, fill: "endzone" }); })}>+ End zone R</MiniBtn>
                <MiniBtn onClick={() => commit((x) => { x.pitch.zones.push({ x: 0, y: 0, w: 2, h: x.pitch.h, fill: "endzone" }); })}>+ End zone L</MiniBtn>
                <MiniBtn onClick={() => commit((x) => { x.pitch.zones.push({ x: x.pitch.w / 3, y: 0, w: x.pitch.w / 3, h: x.pitch.h, fill: "water", label: "River" }); })}>+ River</MiniBtn>
                <MiniBtn onClick={() => commit((x) => { x.pitch.lines.push({ x1: x.pitch.w - 1, y1: 0, x2: x.pitch.w - 1, y2: x.pitch.h, label: "Try line" }); })}>+ Try line</MiniBtn>
                {(d.pitch.zones.length > 0 || d.pitch.lines.length > 0) && (
                  <MiniBtn onClick={() => commit((x) => { x.pitch.zones = []; x.pitch.lines = []; })}>Clear zones</MiniBtn>
                )}
              </div>
            </div>

            {sel ? (
              <div className="rounded-xl border border-border p-3">
                <div className="mb-2 flex items-center justify-between font-semibold capitalize">
                  {sel.kind}
                  <button type="button" onClick={() => removeEntity(sel.id)} className="text-muted hover:text-danger" aria-label="Delete"><Trash2 className="size-4" /></button>
                </div>
                {(sel.kind === "attacker" || sel.kind === "defender" || sel.kind === "coach") && (
                  <label className="mb-2 block">
                    <span className="text-xs text-muted">Label (max 3)</span>
                    <input value={sel.label ?? ""} maxLength={3} onChange={(e) => updateEntity(sel.id, { label: e.target.value || undefined })} className="mt-1 h-8 w-full rounded-lg border border-border bg-surface px-2" />
                  </label>
                )}
                {(sel.kind === "attacker" || sel.kind === "defender") && (
                  <div className="mb-2 flex gap-1">
                    {TEAM_COLOURS.map((c) => (
                      <button key={c} type="button" aria-label={c} onClick={() => updateEntity(sel.id, { team: c })} className={cn("size-5 rounded-full", sel.team === c && "ring-2 ring-text ring-offset-1")} style={{ background: TEAM_HEX[c] }} />
                    ))}
                  </div>
                )}
                <MiniBtn onClick={() => toggleHidden(sel.id)}>
                  {selHidden ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />} {selHidden ? "Show" : "Hide"} in this step
                </MiniBtn>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border p-3 text-xs text-muted">
                Add players from the toolbar, then drag them. Each step remembers where everyone is; Preview animates between steps.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="rounded-xl border border-border p-3">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {d.steps.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { setStep(i); setArrowStart(null); }}
              className={cn("h-8 rounded-lg px-3 text-sm font-medium", i === step ? "bg-brand text-brand-fg" : "bg-surface-2 text-muted hover:text-text")}
            >
              {i === 0 ? "Set-up" : `Step ${i}`}
            </button>
          ))}
          <button type="button" onClick={addStep} className="inline-flex h-8 items-center gap-1 rounded-lg border border-dashed border-border px-3 text-sm text-muted hover:text-text">
            <Plus className="size-4" /> Step
          </button>
        </div>
        <input
          value={cur.caption}
          onChange={(e) => commit((x) => { x.steps[step].caption = e.target.value; }, false)}
          placeholder={step === 0 ? "Set-up: describe the starting layout…" : "What happens in this step?"}
          className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm"
        />
        <div className="mt-2 flex flex-wrap gap-1">
          <MiniBtn onClick={autoArrows} disabled={step === 0}><Wand2 className="size-3.5" /> Auto arrows from movement</MiniBtn>
          <MiniBtn onClick={bendLastArrow} disabled={!cur.arrows.length}><Spline className="size-3.5" /> Bend last arrow</MiniBtn>
          <MiniBtn onClick={() => commit((x) => { x.steps[step].arrows = []; x.steps[step].callouts = []; })} disabled={!cur.arrows.length && !cur.callouts.length}>Clear arrows</MiniBtn>
          <MiniBtn onClick={duplicateStep}><Copy className="size-3.5" /> Duplicate</MiniBtn>
          <MiniBtn onClick={() => moveStep(-1)} disabled={step <= 1}><ChevronLeft className="size-3.5" /></MiniBtn>
          <MiniBtn onClick={() => moveStep(1)} disabled={step === 0 || step >= d.steps.length - 1}><ChevronRight className="size-3.5" /></MiniBtn>
          <MiniBtn onClick={deleteStep} disabled={d.steps.length < 2}><Trash2 className="size-3.5" /> Delete step</MiniBtn>
        </div>
      </div>
    </div>
  );
}

function ToolBtn({ active, label, children, onClick }: { active?: boolean; label: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} className={cn("inline-flex size-8 items-center justify-center rounded-md transition", active ? "bg-brand text-brand-fg" : "text-muted hover:bg-surface-2 hover:text-text")}>
      {children}
    </button>
  );
}

function MiniBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-surface px-2 text-xs font-medium text-muted hover:text-text disabled:opacity-40">
      {children}
    </button>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-muted">{label}</span>
      <input
        type="number"
        min={4}
        max={70}
        step={1}
        defaultValue={value}
        onBlur={(e) => { const v = Number(e.target.value); if (v >= 4 && v <= 70 && v !== value) onChange(v); }}
        className="mt-1 h-8 w-full rounded-lg border border-border bg-surface px-2"
      />
    </label>
  );
}
