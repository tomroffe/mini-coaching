"use client";

import { motion } from "framer-motion";
import { Check, HelpCircle, X } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { cn } from "@/lib/utils";
import { setAvailability } from "./actions";

type Status = "available" | "maybe" | "unavailable";
type A = { weekId: string; userId: string; status: Status };
const CYCLE: Record<string, Status | null> = { undefined: "available", available: "maybe", maybe: "unavailable", unavailable: null };

export function AvailabilityGrid({ me, isAdmin, weeks, coaches, availability, focusWeekId }: { me: string; isAdmin: boolean; weeks: { id: string; date: string; status: string }[]; coaches: { id: string; name: string; head: boolean; assigned: boolean }[]; availability: A[]; focusWeekId?: string }) {
  const [, start] = useTransition();
  const [state, apply] = useOptimistic(availability, (cur, u: { weekId: string; userId: string; status: Status | null }) => {
    const rest = cur.filter((a) => !(a.weekId === u.weekId && a.userId === u.userId));
    return u.status ? [...rest, { weekId: u.weekId, userId: u.userId, status: u.status }] : rest;
  });
  const get = (w: string, u: string) => state.find((a) => a.weekId === w && a.userId === u)?.status;

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-surface p-2 text-left font-semibold sm:p-3">Coach</th>
            {weeks.map((w) => {
              const d = new Date(w.date + "T12:00");
              return (
                <th key={w.id} className={cn("min-w-16 p-2 text-center font-medium", w.id === focusWeekId && "bg-brand-soft")}>
                  <div className="text-[10px] uppercase text-muted">{d.toLocaleDateString("en-GB", { month: "short" })}</div>
                  <div className="text-lg leading-none font-bold">{d.getDate()}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {coaches.map((c) => {
            const editable = c.id === me || isAdmin;
            return (
              <tr key={c.id} className={cn("border-t border-border", c.id === me && "bg-brand-soft/40")}>
                <td className={cn("sticky left-0 z-10 max-w-[7.5rem] p-2 sm:max-w-none sm:p-3 sm:whitespace-nowrap", c.id === me ? "bg-brand-soft" : "bg-surface")}>
                  <div className="truncate font-medium" title={c.name}>{c.name}{c.id === me && <span className="ml-1 text-xs text-brand">(you)</span>}</div>
                  <div className="text-xs text-muted">{c.head ? "Head coach" : c.assigned ? "Assistant" : "Helper"}</div>
                </td>
                {weeks.map((w) => {
                  const s = get(w.id, c.id);
                  return (
                    <td key={w.id} className={cn("p-1.5 text-center", w.id === focusWeekId && "bg-brand-soft/60")}>
                      <motion.button
                        whileTap={editable ? { scale: 0.85 } : undefined}
                        disabled={!editable}
                        onClick={() => {
                          const next = CYCLE[String(s)];
                          start(async () => { apply({ weekId: w.id, userId: c.id, status: next }); await setAvailability(w.id, c.id, next); });
                        }}
                        aria-label={`${c.name} ${w.date}: ${s ?? "not set"}`}
                        className={cn(
                          "mx-auto flex size-10 items-center justify-center rounded-xl transition",
                          s === "available" && "bg-emerald-500 text-white",
                          s === "maybe" && "bg-amber-400 text-white",
                          s === "unavailable" && "bg-red-500/15 text-red-600",
                          !s && "border border-dashed border-border text-muted",
                          editable ? "cursor-pointer hover:scale-105" : "cursor-default",
                        )}
                      >
                        {s === "available" ? <Check className="size-5" /> : s === "maybe" ? <HelpCircle className="size-5" /> : s === "unavailable" ? <X className="size-5" /> : null}
                      </motion.button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border">
            <td className="sticky left-0 bg-surface p-2 text-xs font-semibold text-muted sm:p-3">Available</td>
            {weeks.map((w) => {
              const n = state.filter((a) => a.weekId === w.id && a.status === "available").length;
              return (
                <td key={w.id} className="p-2 text-center">
                  <span className={cn("inline-flex min-w-8 justify-center rounded-full px-2 py-0.5 text-sm font-bold", n >= 2 ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-amber-400/20 text-amber-700 dark:text-amber-300")}>{n}</span>
                </td>
              );
            })}
          </tr>
        </tfoot>
      </table>
      <p className="border-t border-border px-3 py-2 text-xs text-muted">Tap to cycle: available → maybe → unavailable → clear.</p>
    </div>
  );
}
