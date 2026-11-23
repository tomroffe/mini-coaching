"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Grid2x2, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import type { Diagram } from "@/lib/diagram";
import { cn } from "@/lib/utils";
import { DiagramSvg } from "./diagram-svg";

type Props = {
  diagram: Diagram;
  /** no controls/caption: for cards & hero */
  chromeless?: boolean;
  autoPlay?: boolean;
  /** play only while hovered (cards) */
  hoverPlay?: boolean;
  className?: string;
};

const STEP_MS = 2600;

export function DrillDiagram({ diagram, chromeless, autoPlay, hoverPlay, className }: Props) {
  const n = diagram.steps.length;
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(!!autoPlay);
  const [speed, setSpeed] = useState(1);
  const [grid, setGrid] = useState(false);

  useEffect(() => {
    if (!playing || n < 2) return;
    const t = setTimeout(() => setStep((s) => (s + 1) % n), (step === n - 1 ? STEP_MS * 1.4 : STEP_MS) / speed);
    return () => clearTimeout(t);
  }, [playing, step, n, speed]);

  if (chromeless) {
    return (
      <div
        className={className}
        onMouseEnter={hoverPlay ? () => { setStep(1 % n); setPlaying(true); } : undefined}
        onMouseLeave={hoverPlay ? () => { setPlaying(false); setStep(0); } : undefined}
      >
        <DiagramSvg diagram={diagram} step={step} className="block h-auto w-full" />
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border bg-surface", className)}>
      {grid ? (
        <div className="grid gap-3 p-3 sm:grid-cols-2">
          {diagram.steps.map((s, i) => (
            <figure key={i} className="space-y-1.5">
              <DiagramSvg diagram={diagram} step={i} animate={false} className="block h-auto w-full rounded-xl" />
              <figcaption className="text-sm">
                <span className="font-semibold">{i === 0 ? "Set-up" : `Step ${i}`}:</span> {s.caption.replace(/^Set-up:\s*/i, "")}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <>
          <div className="relative">
            <DiagramSvg diagram={diagram} step={step} speed={speed} className="block h-auto w-full" />
            <div className="pointer-events-none absolute top-3 left-3 rounded-full bg-black/45 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              {step === 0 ? "Set-up" : `Step ${step} of ${n - 1}`}
            </div>
          </div>
          <div className="min-h-14 border-t border-border px-4 py-3">
            <AnimatePresence mode="wait">
              <motion.p
                key={step}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="text-sm sm:text-base"
              >
                {diagram.steps[step]?.caption}
              </motion.p>
            </AnimatePresence>
          </div>
        </>
      )}
      <div className="no-print flex flex-wrap items-center gap-2 border-t border-border bg-surface-2/60 px-3 py-2">
        {!grid && (
          <>
            <IconBtn label="Previous step" onClick={() => { setPlaying(false); setStep((s) => Math.max(0, s - 1)); }} disabled={step === 0}>
              <ChevronLeft className="size-4" />
            </IconBtn>
            <button
              onClick={() => { if (!playing && step === n - 1) setStep(0); setPlaying((p) => !p); }}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand px-4 text-sm font-semibold text-brand-fg shadow-sm transition active:scale-95"
            >
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
              {playing ? "Pause" : "Play"}
            </button>
            <IconBtn label="Next step" onClick={() => { setPlaying(false); setStep((s) => Math.min(n - 1, s + 1)); }} disabled={step === n - 1}>
              <ChevronRight className="size-4" />
            </IconBtn>
            <IconBtn label="Restart" onClick={() => { setStep(0); setPlaying(true); }}>
              <RotateCcw className="size-4" />
            </IconBtn>
            <div className="mx-1 flex items-center gap-1.5">
              {diagram.steps.map((_, i) => (
                <button
                  key={i}
                  aria-label={`Go to step ${i}`}
                  onClick={() => { setPlaying(false); setStep(i); }}
                  className={cn("h-2 rounded-full transition-all", i === step ? "w-6 bg-brand" : "w-2 bg-border hover:bg-muted")}
                />
              ))}
            </div>
          </>
        )}
        <div className="ml-auto flex items-center gap-1">
          {!grid && (
            <select
              aria-label="Playback speed"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="h-8 rounded-lg border border-border bg-surface px-2 text-xs"
            >
              <option value={0.5}>0.5×</option>
              <option value={1}>1×</option>
              <option value={1.5}>1.5×</option>
            </select>
          )}
          <IconBtn label={grid ? "Animated view" : "Show all steps"} onClick={() => { setPlaying(false); setGrid((g) => !g); }}>
            {grid ? <Play className="size-4" /> : <Grid2x2 className="size-4" />}
          </IconBtn>
        </div>
      </div>
    </div>
  );
}

function IconBtn({ label, children, ...p }: React.ComponentProps<"button"> & { label: string }) {
  return (
    <button aria-label={label} title={label} className="inline-flex size-9 items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-text disabled:opacity-30" {...p}>
      {children}
    </button>
  );
}
