"use client";

import { Check, Copy, X } from "lucide-react";
import { useActionState, useOptimistic, useState, useTransition } from "react";
import { Button, Input, Select } from "@/components/ui";
import { cn } from "@/lib/utils";
import { createInvite, revokeInvite, setAssignment } from "./actions";

function CopyLink({ url }: { url: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <code className="min-w-0 flex-1 truncate rounded-lg bg-surface-2 px-2 py-1.5 text-xs">{url}</code>
      <Button
        size="sm"
        variant="secondary"
        type="button"
        className="w-full sm:w-auto"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          } catch {}
        }}
      >
        {done ? <Check className="size-4" /> : <Copy className="size-4" />} {done ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

export function InviteForm({ origin }: { origin: string }) {
  const [state, action, pending] = useActionState(createInvite, undefined);
  return (
    <div className="space-y-3">
      <form action={action} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_8rem_auto]">
        <Input name="name" placeholder="Full name" required />
        <Input name="email" type="email" placeholder="Email" required />
        <Select name="role" defaultValue="coach">
          <option value="coach">Coach</option>
          <option value="parent">Parent</option>
          <option value="admin">Admin</option>
        </Select>
        <Button disabled={pending}>Create invite</Button>
      </form>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.ok && (
        <div className="space-y-1 rounded-xl border border-brand/40 bg-brand-soft p-3">
          <p className="text-sm">{state.ok}</p>
          {state.link && <CopyLink url={origin + state.link} />}
        </div>
      )}
    </div>
  );
}

export function PendingInvites({ invites, origin }: { invites: { token: string; name: string; email: string; role: string; expiresAt: string }[]; origin: string }) {
  return (
    <div className="mt-4">
      <div className="mb-2 text-sm font-semibold">Pending invites</div>
      <div className="space-y-2">
        {invites.map((i) => (
          <div key={i.token} className="rounded-xl border border-border p-2.5">
            <div className="mb-1.5 flex items-start justify-between gap-2 text-sm">
              <span className="min-w-0 break-words"><span className="font-medium">{i.name}</span> <span className="text-muted">· {i.email} · {i.role}</span></span>
              <button onClick={() => revokeInvite(i.token)} className="-m-1.5 shrink-0 rounded-lg p-1.5 text-muted hover:text-danger" aria-label={`Revoke invite for ${i.name}`}><X className="size-4" /></button>
            </div>
            <CopyLink url={`${origin}/invite/${i.token}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

type Assign = { userId: string; ageGroupId: string; role: "head" | "assistant" };
const NEXT = { none: "assistant", assistant: "head", head: null } as const;

export function AssignmentGrid({ coaches, groups, assignments }: { coaches: { id: string; name: string; role: string }[]; groups: { id: string; code: string; colour: string }[]; assignments: Assign[] }) {
  const [, start] = useTransition();
  const [state, apply] = useOptimistic(assignments, (cur, u: { userId: string; ageGroupId: string; role: Assign["role"] | null }) => {
    const rest = cur.filter((a) => !(a.userId === u.userId && a.ageGroupId === u.ageGroupId));
    return u.role ? [...rest, { userId: u.userId, ageGroupId: u.ageGroupId, role: u.role }] : rest;
  });
  if (!coaches.length) return <p className="text-sm text-muted">Invite some coaches first.</p>;
  return (
    <div className="relative -mx-5">
    <div className="overflow-x-auto px-5">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-surface p-2 text-left font-medium text-muted">Coach</th>
            {groups.map((g) => <th key={g.id} className="p-2 text-center font-semibold" style={{ color: g.colour }}>{g.code}</th>)}
          </tr>
        </thead>
        <tbody>
          {coaches.map((c) => (
            <tr key={c.id} className="border-t border-border">
              <td className="sticky left-0 z-10 max-w-[8rem] bg-surface p-2 sm:max-w-none">
                <div className="truncate" title={c.name}>{c.name}</div>
                {c.role === "admin" && <div className="text-xs text-muted">admin</div>}
              </td>
              {groups.map((g) => {
                const a = state.find((x) => x.userId === c.id && x.ageGroupId === g.id);
                const next = NEXT[a?.role ?? "none"];
                return (
                  <td key={g.id} className="p-1 text-center">
                    <button
                      onClick={() => start(async () => { apply({ userId: c.id, ageGroupId: g.id, role: next }); await setAssignment(c.id, g.id, next); })}
                      aria-label={`${c.name} ${g.code}: ${a ? a.role : "not assigned"}`}
                      className={cn("h-10 w-14 rounded-lg text-xs font-semibold transition sm:h-8 sm:w-20", a ? "text-white" : "border border-dashed border-border text-muted hover:text-text")}
                      style={a ? { background: g.colour, opacity: a.role === "head" ? 1 : 0.7 } : undefined}
                    >
                      {a ? (a.role === "head" ? "Head" : <><span className="sm:hidden">Asst</span><span className="hidden sm:inline">Assistant</span></>) : "–"}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
      {/* hint that the table scrolls sideways on phones */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-surface to-transparent sm:hidden" />
    </div>
  );
}
