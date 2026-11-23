"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Trash2, UserX } from "lucide-react";
import { useActionState, useState } from "react";
import { Button, Field, Input } from "@/components/ui";
import { deleteAccount, unenrolChild } from "./actions";

export function UnenrolChild({ playerId, firstName, lastName, group, shared }: { playerId: string; firstName: string; lastName: string; group?: string; shared: boolean }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [state, action, pending] = useActionState(unenrolChild.bind(null, playerId), undefined);
  const matches = typed.trim().toLowerCase() === firstName.trim().toLowerCase();
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-medium">{firstName} {lastName}</div>
          {group && <div className="text-xs text-muted">{group}</div>}
        </div>
        {!open && (
          <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
            <UserX className="size-4" /> Unenrol
          </Button>
        )}
      </div>
      <AnimatePresence>
        {open && (
          <motion.form action={action} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-3 pt-3">
              <p className="text-sm">
                This permanently deletes {firstName}&apos;s record, attendance, awards and photo
                {shared && <> for <strong>all</strong> linked parents</>}.
              </p>
              <Field label={`Type ${firstName} to confirm`}>
                <Input name="confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
              </Field>
              {state?.error && <p className="text-sm text-danger">{state.error}</p>}
              <div className="flex gap-2">
                <Button variant="danger" size="sm" disabled={!matches || pending}>{pending ? "Unenrolling…" : `Unenrol ${firstName}`}</Button>
                <Button variant="ghost" size="sm" type="button" onClick={() => { setOpen(false); setTyped(""); }}>Cancel</Button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deleteAccount, undefined);
  if (!open)
    return (
      <Button variant="secondary" className="text-danger" onClick={() => setOpen(true)}>
        <Trash2 className="size-4" /> Delete my account
      </Button>
    );
  return (
    <form action={action} className="space-y-3">
      <Field label="Enter your password to confirm">
        <Input type="password" name="password" autoComplete="current-password" required autoFocus />
      </Field>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <div className="flex gap-2">
        <Button variant="danger" disabled={pending}>{pending ? "Deleting…" : "Permanently delete account"}</Button>
        <Button variant="ghost" type="button" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
