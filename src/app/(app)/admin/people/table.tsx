"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, MoreHorizontal, Search, Trash2, UserCheck, UserX, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { Avatar, Button, Card, Empty, Input } from "@/components/ui";
import { cn, fmtDate } from "@/lib/utils";
import { deleteUser, updateUser } from "../actions";

type Role = "admin" | "coach" | "parent";
export type Person = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  joined: string;
  groups: { code: string; colour: string; head: boolean }[];
  children: { id: string; name: string; group?: string; onlyParent: boolean }[];
};

const ROLE_META: Record<Role, { label: string; plural: string; colour: string }> = {
  admin: { label: "Admin", plural: "Admins", colour: "#7c3aed" },
  coach: { label: "Coach", plural: "Coaches", colour: "#0d9488" },
  parent: { label: "Parent", plural: "Parents", colour: "#2563eb" },
};
const PAGE = 50;
type SortKey = "name" | "role" | "joined";

export function PeopleTable({ people: initial, meId }: { people: Person[]; meId: string }) {
  const [people, patch] = useOptimistic(initial, (cur, u: { id: string; role?: Role; active?: boolean }) =>
    cur.map((p) => (p.id === u.id ? { ...p, ...(u.role ? { role: u.role } : {}), ...(u.active !== undefined ? { active: u.active } : {}) } : p)),
  );
  const [, start] = useTransition();
  const [q, setQ] = useState("");
  const [role, setRole] = useState<Role | "all">("all");
  const [status, setStatus] = useState<"active" | "inactive" | "all">("active");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "name", dir: 1 });
  const [limit, setLimit] = useState(PAGE);
  const [deleting, setDeleting] = useState<Person | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => setLimit(PAGE), [q, role, status]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const inStatus = people.filter((p) => status === "all" || (status === "active" ? p.active : !p.active));
  const counts = { all: inStatus.length, admin: 0, coach: 0, parent: 0 } as Record<Role | "all", number>;
  for (const p of inStatus) counts[p.role]++;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = inStatus.filter(
      (p) =>
        (role === "all" || p.role === role) &&
        (!needle || [p.name, p.email, ...p.children.map((c) => c.name), ...p.groups.map((g) => g.code)].join(" ").toLowerCase().includes(needle)),
    );
    const order: Record<Role, number> = { admin: 0, coach: 1, parent: 2 };
    return list.sort((a, b) => {
      const c = sort.key === "name" ? a.name.localeCompare(b.name) : sort.key === "role" ? order[a.role] - order[b.role] || a.name.localeCompare(b.name) : a.joined.localeCompare(b.joined);
      return c * sort.dir;
    });
  }, [inStatus, q, role, sort]);

  const setSortKey = (key: SortKey) => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === "joined" ? -1 : 1 }));

  return (
    <div className="space-y-4">
      {/* Filters: one row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, child or age group…" className="pl-9" aria-label="Search people" />
          {q && (
            <button onClick={() => setQ("")} className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted hover:text-text" aria-label="Clear search">
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="inline-flex rounded-full border border-border bg-surface p-0.5 text-sm" role="radiogroup" aria-label="Role">
          {(["all", "admin", "coach", "parent"] as const).map((r) => (
            <button
              key={r}
              role="radio"
              aria-checked={role === r}
              onClick={() => setRole(r)}
              className={cn("relative rounded-full px-3 py-1 font-medium whitespace-nowrap transition", role === r ? "text-brand-fg" : "text-muted hover:text-text")}
            >
              {role === r && <motion.span layoutId="role-pill" className="absolute inset-0 rounded-full bg-brand" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
              <span className="relative">
                {r === "all" ? "All" : ROLE_META[r].plural} <span className="tabular-nums opacity-70">{counts[r]}</span>
              </span>
            </button>
          ))}
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="h-10 rounded-xl border border-border bg-surface px-3 text-sm" aria-label="Status">
          <option value="active">Active</option>
          <option value="inactive">Deactivated</option>
          <option value="all">Active + deactivated</option>
        </select>
      </div>

      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-6"><Empty title="Nobody matches">Try a different search or filter.</Empty></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface-2/50 text-left text-xs text-muted">
                <tr>
                  <SortTh k="name" sort={sort} onSort={setSortKey}>Person</SortTh>
                  <SortTh k="role" sort={sort} onSort={setSortKey} className="hidden sm:table-cell">Role</SortTh>
                  <th className="hidden p-3 font-medium sm:table-cell">Coaches / children</th>
                  <SortTh k="joined" sort={sort} onSort={setSortKey} className="hidden md:table-cell">Joined</SortTh>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {filtered.slice(0, limit).map((p) => (
                    <motion.tr
                      key={p.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, x: -20 }}
                      className={cn("border-b border-border/60 last:border-0 hover:bg-surface-2/40", !p.active && "opacity-55")}
                      data-testid="person-row"
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <Avatar first={p.name.split(" ")[0] ?? ""} last={p.name.split(" ").slice(-1)[0]} size={36} colour={ROLE_META[p.role].colour} />
                          <div className="min-w-0">
                            <div className="truncate font-medium">
                              {p.name}
                              {p.id === meId && <span className="ml-1.5 text-xs text-brand">(you)</span>}
                              {!p.active && <span className="ml-1.5 rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-muted uppercase">Deactivated</span>}
                            </div>
                            <div className="truncate text-xs text-muted">{p.email}</div>
                          </div>
                        </div>
                        <div className="mt-2 space-y-2 pl-12 sm:hidden">
                          <RoleSelect p={p} meId={meId} onChange={(r) => start(async () => { patch({ id: p.id, role: r }); await updateUser(p.id, { role: r }); })} />
                          <Links p={p} />
                        </div>
                      </td>
                      <td className="hidden p-3 sm:table-cell">
                        <RoleSelect p={p} meId={meId} onChange={(r) => start(async () => { patch({ id: p.id, role: r }); await updateUser(p.id, { role: r }); })} />
                      </td>
                      <td className="hidden p-3 sm:table-cell">
                        <Links p={p} />
                      </td>
                      <td className="hidden p-3 text-xs whitespace-nowrap text-muted md:table-cell">{fmtDate(p.joined, { day: "numeric", month: "short", year: "numeric" })}</td>
                      <td className="p-3 text-right align-top sm:align-middle">
                        {p.id !== meId && (
                          <RowMenu
                            person={p}
                            onToggleActive={() => start(async () => { patch({ id: p.id, active: !p.active }); await updateUser(p.id, { active: !p.active }); })}
                            onDelete={() => setDeleting(p)}
                          />
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted">
          <span>Showing {Math.min(limit, filtered.length)} of {filtered.length}</span>
          {filtered.length > limit && <Button size="sm" variant="ghost" onClick={() => setLimit((l) => l + PAGE)}>Show more</Button>}
        </div>
      </Card>

      <AnimatePresence>
        {deleting && (
          <DeleteDialog
            person={deleting}
            onClose={() => setDeleting(null)}
            onDeleted={(msg) => {
              // the row disappears when the action's revalidation refreshes the page
              setDeleting(null);
              setToast(msg);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div role="status" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-text px-4 py-2 text-sm text-bg shadow-xl lg:bottom-6">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RoleSelect({ p, meId, onChange }: { p: Person; meId: string; onChange: (r: Role) => void }) {
  return (
    <select
      value={p.role}
      disabled={p.id === meId}
      onChange={(e) => onChange(e.target.value as Role)}
      className="h-8 rounded-lg border border-border bg-surface px-2 text-xs font-semibold disabled:opacity-60"
      style={{ color: ROLE_META[p.role].colour }}
      aria-label={`Role for ${p.name}`}
    >
      {(Object.keys(ROLE_META) as Role[]).map((r) => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
    </select>
  );
}

function Links({ p }: { p: Person }) {
  return (
    <div className="flex max-w-xs flex-wrap gap-1">
      {p.groups.map((g) => (
        <span key={g.code} className="rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ background: g.colour, opacity: g.head ? 1 : 0.75 }} title={g.head ? "Head coach" : "Assistant coach"}>
          {g.code}{g.head && " ★"}
        </span>
      ))}
      {p.children.map((c) => (
        <Link key={c.id} href={`/players/${c.id}`} className="rounded-full bg-surface-2 px-2 py-0.5 text-xs hover:bg-brand-soft hover:text-brand">
          {c.name}{c.group && <span className="text-muted"> · {c.group}</span>}
        </Link>
      ))}
      {!p.groups.length && !p.children.length && <span className="text-xs text-muted">–</span>}
    </div>
  );
}

function SortTh({ k, sort, onSort, children, className }: { k: SortKey; sort: { key: SortKey; dir: 1 | -1 }; onSort: (k: SortKey) => void; children: React.ReactNode; className?: string }) {
  return (
    <th className={cn("p-3 font-medium", className)} aria-sort={sort.key === k ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button onClick={() => onSort(k)} className={cn("inline-flex items-center gap-1 hover:text-text", sort.key === k && "text-text")}>
        {children}
        {sort.key === k && (sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
      </button>
    </th>
  );
}

function RowMenu({ person: p, onToggleActive, onDelete }: { person: Person; onToggleActive: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div ref={ref} className="relative inline-block">
      <button onClick={() => setOpen((o) => !o)} className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-text" aria-label={`Actions for ${p.name}`} aria-expanded={open}>
        <MoreHorizontal className="size-4" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-xl border border-border bg-surface text-left text-sm shadow-xl"
            role="menu"
          >
            <button role="menuitem" onClick={() => { setOpen(false); onToggleActive(); }} className="flex w-full items-center gap-2 px-3 py-2 hover:bg-surface-2">
              {p.active ? <UserX className="size-4" /> : <UserCheck className="size-4" />}
              {p.active ? "Deactivate (block sign-in)" : "Reactivate"}
            </button>
            <button role="menuitem" onClick={() => { setOpen(false); onDelete(); }} className="flex w-full items-center gap-2 px-3 py-2 text-danger hover:bg-surface-2">
              <Trash2 className="size-4" /> Delete permanently…
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DeleteDialog({ person: p, onClose, onDeleted }: { person: Person; onClose: () => void; onDeleted: (msg: string) => void }) {
  const orphans = p.children.filter((c) => c.onlyParent);
  const [alsoKids, setAlsoKids] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ok = typed.trim().toLowerCase() === p.name.trim().toLowerCase();

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Delete ${p.name}`}
        className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-2xl"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold">Delete {p.name}?</h2>
        <p className="mt-1 text-sm text-muted">{p.email} · {ROLE_META[p.role].label}</p>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">
          <li>Their login is removed permanently.</li>
          {p.groups.length > 0 && <li>Coach assignments ({p.groups.map((g) => g.code).join(", ")}), availability and coaching-attendance history are removed.</li>}
          {p.role !== "parent" && <li>Drills, plans, awards and registers they created are kept.</li>}
          {p.children.length > 0 && <li>Links to {p.children.map((c) => c.name).join(", ")} are removed.</li>}
          <li className="text-muted">Want to keep their history? Use <strong>Deactivate</strong> instead.</li>
        </ul>
        {orphans.length > 0 && (
          <label className="mt-4 flex items-start gap-2 rounded-xl border border-border p-3 text-sm">
            <input type="checkbox" checked={alsoKids} onChange={(e) => setAlsoKids(e.target.checked)} className="mt-0.5 accent-[var(--danger)]" />
            <span>
              Also delete {orphans.map((c) => c.name).join(", ")} (no other parent linked): their attendance, awards and photos too.
              <span className="block text-xs text-muted">Leave unticked to keep them in the roster.</span>
            </span>
          </label>
        )}
        <label className="mt-4 block text-sm">
          <span className="font-medium">Type <span className="font-mono">{p.name}</span> to confirm</span>
          <Input className="mt-1.5" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus aria-label="Confirm name" />
        </label>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="danger"
            disabled={!ok || pending}
            onClick={() =>
              start(async () => {
                const r = await deleteUser(p.id, alsoKids);
                if (r.error) setError(r.error);
                else onDeleted(`${p.name} deleted${r.deletedChildren ? ` (and ${r.deletedChildren} child record${r.deletedChildren === 1 ? "" : "s"})` : ""}.`);
              })
            }
          >
            <Trash2 className="size-4" /> {pending ? "Deleting…" : "Delete permanently"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
