"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, BookOpen, ClipboardCheck, FastForward, MoreHorizontal, Trash2, UserRoundCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { cn, todayISO } from "@/lib/utils";
import { MyAvailability } from "../my-availability";
import { cancelWeekAndShift, deleteWeek, updateWeek } from "./actions";

type Week = { id: string; date: string; status: "training" | "cancelled" | "no_session"; sessionPlanId: string | null; notes: string; startTime: string; endTime: string };
type PlanOpt = { id: string; title: string; sequence: number | null };

const STATUS = {
  training: { label: "Training", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  cancelled: { label: "Cancelled", cls: "bg-red-500/15 text-red-700 dark:text-red-300" },
  no_session: { label: "No session", cls: "bg-slate-500/15 text-slate-600 dark:text-slate-300" },
} as const;

type Mine = "available" | "maybe" | "unavailable" | null;

export function WeekRow({ week: w, plans, isNext, isPast, available, attended, canEdit, colour, userId, mine }: { week: Week; plans: PlanOpt[]; isNext: boolean; isPast: boolean; available: number; attended?: number; canEdit: boolean; colour: string; userId: string; mine: Mine }) {
  const [pending, start] = useTransition();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  // close the menu on any tap/click outside it (mouse-leave never fires on touch screens)
  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [menu]);
  const [msg, setMsg] = useState<string | null>(null);
  const d = new Date(w.date + "T12:00:00");
  const plan = plans.find((p) => p.id === w.sessionPlanId);
  const isFuture = !isPast && w.date !== todayISO();

  return (
    <motion.div
      layout
      className={cn(
        "relative flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border bg-surface p-3 transition",
        isNext ? "border-brand shadow-md ring-2 ring-brand/20" : "border-border",
        (w.status === "cancelled" || w.status === "no_session") && "opacity-60",
        pending && "animate-pulse",
      )}
    >
      {(() => {
        const inner = (
          <>
            <span className="text-[10px] font-semibold uppercase">{d.toLocaleDateString("en-GB", { weekday: "short" })}</span>
            <span className="text-xl leading-none font-bold">{d.getDate()}</span>
            <span className="text-[10px] uppercase">{d.toLocaleDateString("en-GB", { month: "short" })}</span>
          </>
        );
        const cls = "flex w-14 shrink-0 flex-col items-center rounded-xl py-1 text-white";
        const style = { background: isPast ? "#94a3b8" : colour };
        return plan && w.status === "training" ? (
          <Link
            href={`/sessions/${plan.id}`}
            className={cn(cls, "transition hover:scale-105 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand")}
            style={style}
            aria-label={`View session for ${d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}`}
          >
            {inner}
          </Link>
        ) : (
          <div className={cls} style={style}>{inner}</div>
        );
      })()}

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          {canEdit ? (
            <select
              value={w.status}
              onChange={(e) => start(() => updateWeek(w.id, { status: e.target.value as Week["status"] }))}
              className={cn("rounded-full border-0 px-2 py-0.5 text-xs font-semibold", STATUS[w.status].cls)}
              aria-label="Status"
            >
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          ) : (
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", STATUS[w.status].cls)}>{STATUS[w.status].label}</span>
          )}
          <span className="text-xs text-muted tabular-nums">{w.startTime}–{w.endTime}</span>
          {isNext && <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-brand-fg">Next up</span>}
          {w.notes && <span className="truncate text-xs text-muted">· {w.notes}</span>}
        </div>
        {w.status === "training" ? (
          canEdit ? (
            <select
              value={w.sessionPlanId ?? ""}
              onChange={(e) => start(() => updateWeek(w.id, { sessionPlanId: e.target.value || null }))}
              className="w-full max-w-lg truncate rounded-lg border border-border bg-surface px-2 py-1.5 text-sm font-medium"
              aria-label="Session plan"
            >
              <option value="">No plan assigned</option>
              {plans.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          ) : (
            <div className="text-sm font-medium">{plan?.title ?? "No plan assigned"}</div>
          )
        ) : null}
        {msg && <p className="mt-1 text-xs text-amber-600">{msg}</p>}
      </div>

      <div className="flex w-full flex-wrap items-center gap-2 border-t border-border/60 pt-2.5">
        {plan && w.status === "training" ? (
          <Link
            href={`/sessions/${plan.id}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-soft px-3.5 text-sm font-semibold text-brand transition hover:bg-brand hover:text-brand-fg"
          >
            <BookOpen className="size-4" /> View plan <ArrowRight className="size-3.5" />
          </Link>
        ) : w.status === "training" ? (
          <span className="inline-flex h-9 items-center rounded-full bg-surface-2 px-3.5 text-sm text-muted">No plan yet</span>
        ) : null}
        {w.status === "training" && (
          <Link
            href={`/coaches?week=${w.id}`}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition hover:brightness-95",
              available >= 2 ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-amber-400/20 text-amber-800 dark:text-amber-300",
            )}
            title={available >= 2 ? "Enough coaches available" : "Fewer than two coaches available"}
            aria-label={`${available} coach${available === 1 ? "" : "es"} available`}
          >
            {available >= 2 ? <UserRoundCheck className="size-4" /> : <AlertTriangle className="size-4" />}
            {available} coach{available === 1 ? "" : "es"}
          </Link>
        )}
        {w.status === "training" && !isFuture && (
          <Link
            href={`/register/${w.id}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-sm font-medium transition hover:bg-surface-2"
          >
            <ClipboardCheck className="size-4" /> {attended === undefined ? "Take register" : `${attended} here`}
          </Link>
        )}
        {w.status === "training" && !isPast ? <MyAvailability weekId={w.id} userId={userId} current={mine} /> : <span className="ml-auto" />}
        {canEdit && (
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenu((m) => !m)} className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface-2" aria-label="Week actions" aria-expanded={menu}>
              <MoreHorizontal className="size-4" />
            </button>
            {menu && (
              <div className="absolute right-0 z-20 mt-1 w-64 overflow-hidden rounded-xl border border-border bg-surface text-sm shadow-xl" role="menu">
                {w.status === "training" && (
                  <button
                    className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-surface-2"
                    onClick={() => {
                      setMenu(false);
                      if (!window.confirm("Cancel this session and move this plan and all later plans forward by one week?")) return;
                      start(async () => {
                        const r = await cancelWeekAndShift(w.id);
                        if (r.dropped) setMsg(`${r.dropped} plan(s) no longer fit in the season. Add a week or merge sessions.`);
                      });
                    }}
                  >
                    <FastForward className="mt-0.5 size-4 shrink-0 text-amber-600" />
                    <span><span className="font-medium">Cancel & shift sequence</span><br /><span className="text-xs text-muted">Later plans move forward one week</span></span>
                  </button>
                )}
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-surface-2"
                  onClick={() => {
                    setMenu(false);
                    const notes = window.prompt("Notes for this week", w.notes);
                    if (notes !== null) start(() => updateWeek(w.id, { notes }));
                  }}
                >
                  ✎ Edit notes
                </button>
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-danger hover:bg-surface-2"
                  onClick={() => {
                    setMenu(false);
                    if (window.confirm("Remove this week from the calendar? Its register and availability will be deleted.")) start(() => deleteWeek(w.id));
                  }}
                >
                  <Trash2 className="size-4" /> Remove week
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
