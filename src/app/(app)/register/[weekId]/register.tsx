"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, CheckCheck, Clock, X } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { Avatar, Button, Card, CardHeader } from "@/components/ui";
import { cn } from "@/lib/utils";
import { markAllPresent, setAttendance, setCoachAttended } from "../actions";

type Status = "present" | "absent" | "late" | null;
type P = { id: string; firstName: string; lastName: string; photo: string | null; medical: boolean; status: Status };

/** Tap cycles: unmarked → present → absent → unmarked. "Late" via the small clock button. */
const NEXT: Record<string, Status> = { null: "present", present: "absent", absent: null, late: "present" };

export function PlayerRegister({ weekId, players, colour }: { weekId: string; players: P[]; colour: string }) {
  const [, start] = useTransition();
  const [state, setState] = useOptimistic(players, (cur, upd: { ids: string[]; status: Status }) =>
    cur.map((p) => (upd.ids.includes(p.id) ? { ...p, status: upd.status } : p)),
  );
  const present = state.filter((p) => p.status === "present" || p.status === "late").length;
  const unmarked = state.filter((p) => !p.status);

  const set = (id: string, status: Status) =>
    start(async () => {
      setState({ ids: [id], status });
      await setAttendance(weekId, id, status);
    });

  if (!players.length) return <p className="text-muted">No players in this age group yet. Add them on the Players page.</p>;

  return (
    <div className="mb-8">
      <div className="sticky top-14 z-10 -mx-4 mb-4 flex items-center gap-3 bg-bg/90 px-4 py-2 backdrop-blur lg:top-0">
        <div className="flex items-baseline gap-1">
          <motion.span key={present} initial={{ scale: 1.4, color: "var(--brand)" }} animate={{ scale: 1, color: "var(--text)" }} className="text-3xl font-bold tabular-nums">
            {present}
          </motion.span>
          <span className="text-muted">/ {state.length} here</span>
        </div>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
          <motion.div className="h-full rounded-full" style={{ background: colour }} animate={{ width: `${(present / state.length) * 100}%` }} transition={{ type: "spring", stiffness: 200, damping: 30 }} />
        </div>
        {unmarked.length > 0 && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              start(async () => {
                setState({ ids: unmarked.map((p) => p.id), status: "present" });
                await markAllPresent(weekId, unmarked.map((p) => p.id));
              })
            }
          >
            <CheckCheck className="size-4" /> All present
          </Button>
        )}
      </div>
      <p className="mb-3 text-xs text-muted">Tap a player: present → absent → clear. Clock = late.</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {state.map((p) => (
          <motion.div key={p.id} layout className="relative">
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => set(p.id, NEXT[String(p.status)])}
              className={cn(
                "flex w-full flex-col items-center rounded-2xl border-2 bg-surface p-3 transition-colors",
                p.status === "present" && "border-emerald-500 bg-emerald-500/10",
                p.status === "late" && "border-amber-400 bg-amber-400/10",
                p.status === "absent" && "border-red-400/60 opacity-60",
                !p.status && "border-border",
              )}
            >
              <div className="relative">
                <Avatar first={p.firstName} last={p.lastName} src={p.photo} size={56} colour={colour} />
                <AnimatePresence>
                  {p.status && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className={cn(
                        "absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full text-white ring-2 ring-surface",
                        p.status === "present" && "bg-emerald-500",
                        p.status === "late" && "bg-amber-400",
                        p.status === "absent" && "bg-red-500",
                      )}
                    >
                      {p.status === "present" ? <Check className="size-3.5" /> : p.status === "late" ? <Clock className="size-3.5" /> : <X className="size-3.5" />}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <span className="mt-1.5 w-full truncate text-center text-sm font-medium">{p.firstName}</span>
              <span className="w-full truncate text-center text-xs text-muted">{p.lastName}</span>
            </motion.button>
            <button
              onClick={() => set(p.id, p.status === "late" ? "present" : "late")}
              className={cn("absolute top-1.5 right-1.5 rounded-full p-1", p.status === "late" ? "text-amber-500" : "text-muted/50 hover:text-muted")}
              aria-label={`Mark ${p.firstName} late`}
            >
              <Clock className="size-3.5" />
            </button>
            {p.medical && <span className="absolute top-1.5 left-2 text-xs font-bold text-red-500" title="Has medical notes">⚕︎</span>}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

type C = { id: string; name: string; availability: "available" | "maybe" | "unavailable" | null; attended: boolean | null };

export function CoachRegister({ weekId, coaches }: { weekId: string; coaches: C[] }) {
  const [, start] = useTransition();
  const [state, set] = useOptimistic(coaches, (cur, u: { id: string; attended: boolean }) => cur.map((c) => (c.id === u.id ? { ...c, attended: u.attended } : c)));
  return (
    <Card>
      <CardHeader title="Coaches at this session" subtitle="Assigned coaches plus anyone who marked availability." />
      <div className="grid gap-2 px-5 pb-5 sm:grid-cols-2">
        {state.length === 0 && <p className="text-sm text-muted">No coaches assigned to this age group.</p>}
        {state.map((c) => (
          <button
            key={c.id}
            onClick={() => start(async () => { set({ id: c.id, attended: !c.attended }); await setCoachAttended(weekId, c.id, !c.attended); })}
            className={cn("flex items-center justify-between rounded-xl border-2 p-3 text-left transition", c.attended ? "border-emerald-500 bg-emerald-500/10" : "border-border")}
          >
            <div>
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-muted">{c.availability ? `Said: ${c.availability}` : "No availability given"}</div>
            </div>
            <span className={cn("flex size-7 items-center justify-center rounded-full", c.attended ? "bg-emerald-500 text-white" : "bg-surface-2 text-muted")}>
              <Check className="size-4" />
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}
