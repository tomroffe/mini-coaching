"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Download, PartyPopper, Search, Trash2 } from "lucide-react";
import { useActionState, useEffect, useMemo, useState } from "react";
import { Button, Card, CardHeader, Field, Input, Textarea } from "@/components/ui";
import { AWARD_TYPES, awardType, type AwardType } from "@/lib/awards";
import { cn, todayISO } from "@/lib/utils";
import { deleteAward, giveAward } from "./actions";

export function AwardForm({ players, preselect }: { players: { id: string; name: string; group: string }[]; preselect?: string }) {
  const [state, action, pending] = useActionState(giveAward, undefined);
  const [type, setType] = useState<AwardType>("player_of_week");
  const [title, setTitle] = useState<string>(AWARD_TYPES[0].presets[0]);
  const [selected, setSelected] = useState<string[]>(preselect ? [preselect] : []);
  const [q, setQ] = useState("");
  const [celebrate, setCelebrate] = useState(false);
  const filtered = useMemo(() => players.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase())), [players, q]);

  useEffect(() => {
    if (state?.ok) {
      setCelebrate(true);
      setSelected([]);
      const t = setTimeout(() => setCelebrate(false), 2200);
      return () => clearTimeout(t);
    }
  }, [state]);

  return (
    <Card className="relative overflow-hidden self-start">
      <CardHeader title="Give an award" />
      <form action={action} className="space-y-4 px-5 pb-5">
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">1. Type of award</legend>
          <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Type of award">
            {AWARD_TYPES.map((t) => {
              const on = type === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => {
                    setType(t.value);
                    // swap the title to this type's first preset unless the coach typed their own
                    if (!title || AWARD_TYPES.some((x) => (x.presets as readonly string[]).includes(title))) setTitle(t.presets[0]);
                  }}
                  className={cn("flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-left text-sm font-medium transition", on ? "bg-surface-2" : "border-border text-muted hover:text-text")}
                  style={on ? { borderColor: t.colour } : undefined}
                >
                  <span className="size-3 shrink-0 rounded-sm" style={{ background: t.colour }} />
                  <span>{t.emoji} {t.label}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-xs text-muted">{awardType(type).hint}</p>
        </fieldset>
        <input type="hidden" name="type" value={type} />

        <div>
          <div className="mb-1.5 text-sm font-medium">2. Title</div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {awardType(type).presets.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTitle(t)}
                className={cn("rounded-full border px-2.5 py-1 text-xs font-medium transition", title === t ? "border-brand bg-brand-soft text-brand" : "border-border text-muted hover:text-text")}
              >
                {t}
              </button>
            ))}
          </div>
          <Input name="title" value={title} onChange={(e) => setTitle(e.target.value)} required aria-label="Title" placeholder="Or type your own" />
        </div>
        <Field label="3. Why? (appears on the certificate)"><Textarea name="reason" rows={2} placeholder="e.g. Brilliant support running and always encouraging teammates" /></Field>
        <Field label="Date"><Input type="date" name="awardedOn" defaultValue={todayISO()} /></Field>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-sm font-medium">
            <span>4. Players ({selected.length})</span>
            {selected.length > 0 && <button type="button" className="text-xs text-muted" onClick={() => setSelected([])}>clear</button>}
          </div>
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a player" className="pl-9" />
          </div>
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-border p-1">
            {filtered.length === 0 && <p className="p-2 text-sm text-muted">No players.</p>}
            {filtered.map((p) => {
              const on = selected.includes(p.id);
              return (
                <label key={p.id} className={cn("flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm", on ? "bg-brand-soft" : "hover:bg-surface-2")}>
                  <input type="checkbox" name="playerId" value={p.id} checked={on} onChange={() => setSelected((s) => (on ? s.filter((x) => x !== p.id) : [...s, p.id]))} className="accent-[var(--brand)]" />
                  <span className="flex-1">{p.name}</span>
                  <span className="text-xs text-muted">{p.group}</span>
                </label>
              );
            })}
          </div>
        </div>
        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        {state?.ok && (
          <p className="flex items-center gap-2 text-sm text-brand">
            {state.ok}
            {state.awardId && <a href={`/api/certificate/${state.awardId}`} className="inline-flex items-center gap-1 underline"><Download className="size-3.5" /> certificate</a>}
          </p>
        )}
        <Button className="w-full" disabled={pending || !selected.length}><PartyPopper className="size-4" /> {pending ? "Awarding…" : "Award"}</Button>
      </form>
      <AnimatePresence>{celebrate && <Confetti />}</AnimatePresence>
    </Card>
  );
}

function Confetti() {
  const bits = Array.from({ length: 36 }, (_, i) => i);
  const colours = ["#f5b301", "#10b981", "#3b82f6", "#ec4899", "#8b5cf6", "#f97316"];
  return (
    <motion.div className="pointer-events-none absolute inset-0" exit={{ opacity: 0 }}>
      {bits.map((i) => (
        <motion.span
          key={i}
          className="absolute top-1/2 left-1/2 block size-2 rounded-sm"
          style={{ background: colours[i % colours.length] }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
          animate={{ x: (Math.random() - 0.5) * 420, y: (Math.random() - 0.9) * 380, rotate: Math.random() * 720, opacity: 0 }}
          transition={{ duration: 1.6 + Math.random() * 0.6, ease: [0.2, 0.8, 0.4, 1] }}
        />
      ))}
    </motion.div>
  );
}

export function DeleteAward({ id }: { id: string }) {
  return (
    <button onClick={() => { if (window.confirm("Remove this award?")) deleteAward(id); }} className="rounded-lg p-1.5 text-muted hover:text-danger" aria-label="Remove award">
      <Trash2 className="size-4" />
    </button>
  );
}
