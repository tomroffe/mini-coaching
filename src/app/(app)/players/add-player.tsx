"use client";

import { AnimatePresence, motion } from "framer-motion";
import { UserPlus, X } from "lucide-react";
import { useActionState, useState } from "react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { createPlayer, importPlayers } from "./actions";

export function AddPlayer({ groups, defaultGroupId }: { groups: { id: string; code: string }[]; defaultGroupId: string }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"one" | "import">("one");
  const [s1, a1, p1] = useActionState(createPlayer, undefined);
  const [s2, a2, p2] = useActionState(importPlayers, undefined);

  return (
    <>
      <Button onClick={() => setOpen(true)}><UserPlus className="size-4" /> <span className="sm:hidden">Add</span><span className="hidden sm:inline">Add player</span></Button>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
            <motion.div
              className="w-full max-w-md rounded-t-3xl bg-surface p-6 shadow-2xl sm:rounded-3xl"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex gap-1 rounded-lg bg-surface-2 p-1 text-sm">
                  <button className={`rounded-md px-3 py-1 ${tab === "one" ? "bg-surface shadow-sm" : "text-muted"}`} onClick={() => setTab("one")}>One player</button>
                  <button className={`rounded-md px-3 py-1 ${tab === "import" ? "bg-surface shadow-sm" : "text-muted"}`} onClick={() => setTab("import")}>Import list</button>
                </div>
                <button onClick={() => setOpen(false)} aria-label="Close" className="text-muted"><X className="size-5" /></button>
              </div>
              {tab === "one" ? (
                <form action={a1} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="First name"><Input name="firstName" required autoFocus /></Field>
                    <Field label="Last name"><Input name="lastName" required /></Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Date of birth"><Input type="date" name="dob" /></Field>
                    <Field label="Age group">
                      <Select name="ageGroupId" defaultValue={defaultGroupId}>{groups.map((g) => <option key={g.id} value={g.id}>{g.code}</option>)}</Select>
                    </Field>
                  </div>
                  <label className="flex items-start gap-2 rounded-xl border border-border p-3 text-sm">
                    <input type="checkbox" name="photoConsent" className="mt-0.5 accent-[var(--brand)]" />
                    <span><span className="font-medium">Parent/guardian has given photo consent</span><br /><span className="text-muted">Required before a photo can be uploaded. Photos are only visible to signed-in coaches and the child&apos;s parents.</span></span>
                  </label>
                  {s1?.error && <p className="text-sm text-danger">{s1.error}</p>}
                  <Button className="w-full" disabled={p1}>{p1 ? "Adding…" : "Add player"}</Button>
                </form>
              ) : (
                <form action={a2} className="space-y-3">
                  <Field label="Age group">
                    <Select name="ageGroupId" defaultValue={defaultGroupId}>{groups.map((g) => <option key={g.id} value={g.id}>{g.code}</option>)}</Select>
                  </Field>
                  <Field label="One player per line" hint="first,last,dob (YYYY-MM-DD, optional),photo consent (yes/no, optional)">
                    <Textarea name="csv" rows={7} placeholder={"Alex,Smith,2021-03-14,yes\nSam,Jones"} className="font-mono text-xs" />
                  </Field>
                  {s2?.error && <p className="text-sm text-danger">{s2.error}</p>}
                  {s2?.ok && <p className="text-sm text-brand">{s2.ok}</p>}
                  <Button className="w-full" disabled={p2}>{p2 ? "Importing…" : "Import"}</Button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
