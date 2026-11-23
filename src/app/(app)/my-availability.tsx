"use client";

import { useOptimistic, useTransition } from "react";
import { cn } from "@/lib/utils";
import { setAvailability } from "./coaches/actions";

type S = "available" | "maybe" | "unavailable" | null;

export function MyAvailability({ weekId, userId, current }: { weekId: string; userId: string; current: S }) {
  const [, start] = useTransition();
  const [s, set] = useOptimistic<S, S>(current, (_, n) => n);
  const opts = [
    { v: "available", label: "I'm in", cls: "bg-emerald-500 text-white" },
    { v: "maybe", label: "Maybe", cls: "bg-amber-400 text-white" },
    { v: "unavailable", label: "Can't", cls: "bg-red-500 text-white" },
  ] as const;
  return (
    <div className="ml-auto flex items-center gap-1 rounded-full bg-surface-2 p-0.5" role="group" aria-label="My availability">
      {opts.map((o) => (
        <button
          key={o.v}
          onClick={() => start(async () => { const n = s === o.v ? null : o.v; set(n); await setAvailability(weekId, userId, n); })}
          className={cn("rounded-full px-2.5 py-1 text-xs font-semibold transition", s === o.v ? o.cls : "text-muted hover:text-text")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
