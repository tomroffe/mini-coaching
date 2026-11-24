"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export type CalEvent = {
  weekId: string;
  date: string; // YYYY-MM-DD
  code: string;
  colour: string;
  status: "training" | "cancelled" | "no_session";
  start?: string;
  planId?: string | null;
  planTitle?: string | null;
  mine?: "available" | "maybe" | "unavailable" | null;
};

type Props = {
  events: CalEvent[];
  today: string;
  /** show the signed-in coach's availability dot */
  showMine?: boolean;
  /** show plan titles in the day cells (desktop) */
  showTitles?: boolean;
  className?: string;
};

const MINE_DOT: Record<string, string> = { available: "bg-emerald-500", maybe: "bg-amber-400", unavailable: "bg-red-500" };
const MINE_LABEL: Record<string, string> = { available: "you're in", maybe: "you said maybe", unavailable: "you can't make it" };
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const ym = (d: string) => d.slice(0, 7);
function addMonths(month: string, n: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function monthCells(month: string) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7; // Monday-first
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1, 1 - offset + i));
    return d.toISOString().slice(0, 10);
  });
}
const longDate = (d: string) => new Date(d + "T12:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

export function MonthCalendar({ events, today, showMine, showTitles, className }: Props) {
  const router = useRouter();
  const visible = useMemo(() => events.filter((e) => e.status !== "no_session"), [events]);
  const byDate = useMemo(() => {
    const m = new Map<string, CalEvent[]>();
    for (const e of visible) m.set(e.date, [...(m.get(e.date) ?? []), e]);
    return m;
  }, [visible]);
  const next = visible.find((e) => e.date >= today && e.status === "training");
  const [month, setMonth] = useState(() => ym(next?.date ?? today));
  const [dir, setDir] = useState(0);
  const [openDay, setOpenDay] = useState<string | null>(null);

  const go = (n: number) => {
    setDir(n);
    setOpenDay(null);
    setMonth((m) => addMonths(m, n));
  };
  const label = new Date(month + "-15T12:00").toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const cells = monthCells(month);
  const sessionsThisMonth = visible.filter((e) => ym(e.date) === month && e.status === "training").length;

  function open(date: string) {
    const evs = byDate.get(date) ?? [];
    if (evs.length === 1 && evs[0].planId && evs[0].status === "training") router.push(`/sessions/${evs[0].planId}`);
    else setOpenDay((d) => (d === date ? null : date));
  }

  return (
    <div className={cn("select-none", className)}>
      <div className="mb-3 flex items-center gap-2">
        <h3 className="min-w-0 flex-1 font-semibold" aria-live="polite">
          {label}{" "}
          <span className="block text-xs font-normal text-muted sm:inline sm:text-sm">
            <span className="hidden sm:inline">· </span>
            {sessionsThisMonth} session{sessionsThisMonth === 1 ? "" : "s"}
          </span>
        </h3>
        <button onClick={() => { setDir(ym(today) > month ? 1 : -1); setMonth(ym(today)); setOpenDay(null); }} className="h-9 rounded-lg px-2.5 text-sm text-muted hover:bg-surface-2 hover:text-text">Today</button>
        <button onClick={() => go(-1)} aria-label="Previous month" className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"><ChevronLeft className="size-5" /></button>
        <button onClick={() => go(1)} aria-label="Next month" className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"><ChevronRight className="size-5" /></button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium tracking-wide text-muted uppercase">
        {WEEKDAYS.map((d) => <div key={d} className="pb-1">{d.slice(0, 1)}<span className="hidden sm:inline">{d.slice(1)}</span></div>)}
      </div>
      <div className="relative overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={month}
            custom={dir}
            initial={{ x: dir * 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: dir * -40, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="grid grid-cols-7 gap-1"
            role="grid"
            aria-label={label}
          >
            {cells.map((date) => {
              const inMonth = ym(date) === month;
              const evs = byDate.get(date) ?? [];
              const isToday = date === today;
              const isNext = next?.date === date;
              const isPast = date < today;
              const training = evs.filter((e) => e.status === "training");
              const allCancelled = evs.length > 0 && training.length === 0;
              const mine = showMine && training[0] ? training[0].mine ?? null : undefined;
              const desc = evs.map((e) => `${e.code} ${e.status === "cancelled" ? "cancelled" : "training"}${e.planTitle ? `, ${e.planTitle}` : ""}${showMine && e.status === "training" ? `, ${e.mine ? MINE_LABEL[e.mine] : "no reply yet"}` : ""}`).join("; ");
              const Comp = evs.length ? "button" : "div";
              return (
                <Comp
                  key={date}
                  {...(evs.length ? { onClick: () => open(date), type: "button" as const, "aria-label": `${longDate(date)}: ${desc}`, "aria-expanded": openDay === date } : {})}
                  className={cn(
                    "relative flex min-h-12 flex-col rounded-xl p-1 text-left transition sm:min-h-20 sm:p-1.5",
                    !inMonth && "opacity-35",
                    evs.length ? "cursor-pointer hover:bg-surface-2" : "",
                    isNext && "bg-brand-soft ring-2 ring-brand",
                    isToday && !isNext && "ring-2 ring-text/60",
                    openDay === date && "bg-surface-2",
                  )}
                >
                  <span className={cn("text-xs font-semibold tabular-nums sm:text-sm", isToday && "text-brand", isPast && !isToday && "text-muted", allCancelled && "line-through")}>
                    {Number(date.slice(8))}
                  </span>
                  {mine !== undefined && !isPast && (
                    <span
                      className={cn("absolute top-1.5 right-1.5 size-2 rounded-full", mine ? MINE_DOT[mine] : "border border-muted")}
                      title={mine ? MINE_LABEL[mine] : "No reply yet"}
                    />
                  )}
                  {/* phones: dots; larger screens: pills */}
                  <div className="mt-auto flex flex-wrap gap-0.5 sm:hidden">
                    {evs.map((e) => (
                      <span key={e.weekId} className={cn("h-1.5 w-full rounded-full", e.status === "cancelled" && "opacity-40")} style={{ background: e.colour }} />
                    ))}
                  </div>
                  <div className="mt-1 hidden min-w-0 flex-col gap-0.5 sm:flex">
                    {evs.map((e) => (
                      <span
                        key={e.weekId}
                        className={cn("truncate rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-white", e.status === "cancelled" && "line-through opacity-45", isPast && "opacity-60")}
                        style={{ background: e.colour }}
                        title={e.planTitle ?? undefined}
                      >
                        {e.code}{showTitles && e.planTitle ? ` · ${e.planTitle.replace(/^Session \d+:\s*/, "")}` : ""}
                      </span>
                    ))}
                  </div>
                </Comp>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {openDay && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-3 rounded-2xl border border-border bg-surface-2/60 p-3">
              <div className="mb-2 flex items-center justify-between text-sm font-semibold">
                {longDate(openDay)}
                <button onClick={() => setOpenDay(null)} aria-label="Close" className="rounded p-1 text-muted hover:text-text"><X className="size-4" /></button>
              </div>
              <ul className="space-y-1.5">
                {(byDate.get(openDay) ?? []).map((e) => (
                  <li key={e.weekId}>
                    <Link
                      href={e.planId ? `/sessions/${e.planId}` : `/season?age=${e.code}`}
                      className="flex items-center gap-2 rounded-xl bg-surface p-2 text-sm hover:bg-brand-soft"
                    >
                      <span className="rounded-md px-1.5 py-0.5 text-xs font-bold text-white" style={{ background: e.colour }}>{e.code}</span>
                      <span className={cn("min-w-0 flex-1 truncate", e.status === "cancelled" && "text-muted line-through")}>
                        {e.status === "cancelled" ? "Cancelled" : e.planTitle ?? "No plan assigned"}
                      </span>
                      {e.start && <span className="text-xs text-muted tabular-nums">{e.start}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded ring-2 ring-text/60" /> Today</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded bg-brand-soft ring-2 ring-brand" /> Next session</span>
        <span className="inline-flex items-center gap-1.5"><span className="line-through">12</span> Cancelled</span>
        {showMine && (
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" /><span className="size-2 rounded-full bg-amber-400" /><span className="size-2 rounded-full bg-red-500" /><span className="size-2 rounded-full border border-muted" /> Your answer
          </span>
        )}
      </div>
    </div>
  );
}
