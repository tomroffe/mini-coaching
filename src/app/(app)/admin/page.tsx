import { and, asc, desc, gt, isNull } from "drizzle-orm";
import Link from "next/link";
import { Save } from "lucide-react";
import { Button, Card, CardHeader, Field, Input, LinkButton, PageHeader } from "@/components/ui";
import { fmtDate } from "@/lib/utils";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { appOrigin } from "@/lib/origin";
import { createSeason, setCurrentSeason, updateAgeGroup } from "./actions";
import { AssignmentGrid, InviteForm, PendingInvites } from "./client";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  await requireAdmin();
  const origin = await appOrigin();
  const [users, invites, groups, assignments, seasons] = await Promise.all([
    db.select().from(schema.users).orderBy(asc(schema.users.role), asc(schema.users.name)),
    db.select().from(schema.invites).where(and(isNull(schema.invites.usedAt), gt(schema.invites.expiresAt, new Date()))).orderBy(desc(schema.invites.createdAt)),
    db.select().from(schema.ageGroups).orderBy(asc(schema.ageGroups.sortOrder)),
    db.select().from(schema.coachAssignments),
    db.select().from(schema.seasons).orderBy(desc(schema.seasons.startDate)),
  ]);
  const staff = users.filter((u) => u.role !== "parent" && u.active);

  return (
    <>
      <PageHeader eyebrow="Admin" title="Club settings" subtitle="People, coaching assignments, age groups and seasons." />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card id="invite" className="scroll-mt-20 xl:col-span-2">
          <CardHeader title="Invite someone" subtitle="Creates a one-time sign-up link. Send it by WhatsApp or email; no email server needed." />
          <div className="px-5 pb-5">
            <InviteForm origin={origin} />
            {invites.length > 0 && <PendingInvites origin={origin} invites={invites.map((i) => ({ token: i.token, name: i.name, email: i.email, role: i.role, expiresAt: i.expiresAt.toISOString() }))} />}
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Coach assignments" subtitle="Coaches can only take registers and manage players for the age groups they're assigned to. Tap to cycle: – → Assistant → Head." />
          <div className="px-5 pb-5">
            <AssignmentGrid
              coaches={staff.map((u) => ({ id: u.id, name: u.name, role: u.role }))}
              groups={groups.map((g) => ({ id: g.id, code: g.code, colour: g.colour }))}
              assignments={assignments.map((a) => ({ userId: a.userId, ageGroupId: a.ageGroupId, role: a.role }))}
            />
          </div>
        </Card>

        <Card className="self-start">
          <CardHeader title="People" subtitle="Search, filter, change roles, deactivate or delete accounts." action={<LinkButton href="/admin/people" size="sm">Manage people →</LinkButton>} />
          <div className="grid grid-cols-3 gap-2 px-5 pb-5 text-center">
            {(["admin", "coach", "parent"] as const).map((r) => (
              <Link key={r} href="/admin/people" className="rounded-xl bg-surface-2 p-3 transition hover:bg-brand-soft">
                <div className="text-2xl font-bold tabular-nums">{users.filter((u) => u.role === r && u.active).length}</div>
                <div className="text-xs text-muted capitalize">{r === "coach" ? "coaches" : `${r}s`}</div>
              </Link>
            ))}
          </div>
          {users.some((u) => !u.active) && <p className="px-5 pb-4 text-xs text-muted">{users.filter((u) => !u.active).length} deactivated</p>}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Seasons" />
            <div className="space-y-2 px-5 pb-5">
              {seasons.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl bg-surface-2 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <span className="font-semibold">{s.name}</span>{" "}
                    <span className="text-muted">{fmtDate(s.startDate, { day: "numeric", month: "short", year: "numeric" })} → {fmtDate(s.endDate, { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                  {s.current ? <span className="text-xs font-semibold text-brand">Current</span> : (
                    <form action={setCurrentSeason.bind(null, s.id)}><Button size="sm" variant="ghost">Make current</Button></form>
                  )}
                </div>
              ))}
              <form action={createSeason} className="grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-2">
                <div className="text-sm font-semibold sm:col-span-2">Add a season</div>
                <Field label="Name" className="sm:col-span-2"><Input name="name" placeholder="2027-28" required /></Field>
                <Field label="Start"><Input type="date" name="startDate" required /></Field>
                <Field label="End"><Input type="date" name="endDate" required /></Field>
                <div className="flex items-center justify-between gap-3 sm:col-span-2">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="current" className="accent-[var(--brand)]" /> Make current</label>
                  <Button size="sm">Add season</Button>
                </div>
              </form>
            </div>
          </Card>

          <Card>
            <CardHeader title="Age groups" />
            <div className="space-y-2 px-5 pb-5">
              {groups.map((g) => (
                <form key={g.id} action={updateAgeGroup.bind(null, g.id)} className="flex items-center gap-2">
                  <input type="color" name="colour" defaultValue={g.colour} className="size-9 shrink-0 cursor-pointer rounded-lg border border-border bg-surface p-0.5" aria-label={`${g.code} colour`} />
                  <span className="w-10 shrink-0 font-semibold sm:w-12">{g.code}</span>
                  <Input name="name" defaultValue={g.name} className="h-9 min-w-0" aria-label={`${g.code} name`} />
                  <Button size="sm" variant="secondary" className="shrink-0" aria-label={`Save ${g.code}`}>
                    <Save className="size-4 sm:hidden" /><span className="hidden sm:inline">Save</span>
                  </Button>
                </form>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
