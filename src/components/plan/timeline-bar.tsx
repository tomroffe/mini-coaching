"use client";

import { motion } from "framer-motion";
import { BLOCK_TYPES } from "@/lib/curriculum";
import { addMinutes, cn } from "@/lib/utils";

export type TimelineBlock = { durationMin: number; blockType: string; title: string };

const colourOf = (t: string) => BLOCK_TYPES.find((b) => b.value === t)?.colour ?? "#64748b";

/** Proportional coloured bar showing how the session's minutes are spent. */
export function TimelineBar({ blocks, startTime = "09:30", compact, className }: { blocks: TimelineBlock[]; startTime?: string; compact?: boolean; className?: string }) {
  const total = blocks.reduce((s, b) => s + b.durationMin, 0) || 1;
  let t = 0;
  return (
    <div className={className}>
      <div className={cn("flex w-full gap-0.5 overflow-hidden rounded-lg", compact ? "h-2" : "h-11")}>
        {blocks.map((b, i) => {
          const start = addMinutes(startTime, t);
          t += b.durationMin;
          return (
            <motion.div
              key={i}
              layout
              initial={{ flexGrow: 0 }}
              animate={{ flexGrow: b.durationMin }}
              transition={{ type: "spring", stiffness: 220, damping: 30, delay: compact ? 0 : i * 0.05 }}
              className="relative min-w-0 overflow-hidden text-white"
              style={{ background: colourOf(b.blockType), flexBasis: 0 }}
              title={`${start} · ${b.title} · ${b.durationMin} min`}
            >
              {!compact && (
                <div className="flex h-full flex-col justify-center px-1.5 leading-tight sm:px-2">
                  {/* phones: minutes only. The block list below names each block. */}
                  <span className="hidden truncate text-[11px] font-semibold sm:block">{b.title}</span>
                  <span className="text-center text-xs font-semibold opacity-90 sm:text-left sm:text-[10px] sm:font-normal">{b.durationMin}′</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
      {!compact && (
        <div className="mt-1 flex justify-between text-[11px] text-muted tabular-nums">
          <span>{startTime}</span>
          <span>{total} min</span>
          <span>{addMinutes(startTime, total)}</span>
        </div>
      )}
    </div>
  );
}
