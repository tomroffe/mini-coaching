import { and, asc, desc, gt, isNull } from "drizzle-orm";
import { Button, Card, CardHeader, Input, PageHeader } from "@/components/ui";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { appOrigin } from "@/lib/origin";
import { createSeason, setCurrentSeason, updateAgeGroup } from "./actions";
import { AssignmentGrid, InviteForm, PendingInvites, UserRow } from "./client";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const me = await requireAdmin();
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
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="xl:col-span-2">
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

        <Card>
          <CardHeader title={`People (${users.length})`} />
          <div className="divide-y divide-border px-5 pb-3">
            {users.map((u) => <UserRow key={u.id} user={{ id: u.id, name: u.name, email: u.email, role: u.role, active: u.active }} isMe={u.id === me.id} />)}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Seasons" />
            <div className="space-y-2 px-5 pb-5">
              {seasons.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2 text-sm">
                  <div><span className="font-semibold">{s.name}</span> <span className="text-muted">{s.startDate} → {s.endDate}</span></div>
                  {s.current ? <span className="text-xs font-semibold text-brand">Current</span> : (
                    <form action={setCurrentSeason.bind(null, s.id)}><Button size="sm" variant="ghost">Make current</Button></form>
                  )}
                </div>
              ))}
              <form action={createSeason} className="grid grid-cols-2 gap-2 pt-2">
                <Input name="name" placeholder="2027-28" required className="col-span-2" />
                <Input type="date" name="startDate" required />
                <Input type="date" name="endDate" required />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="current" className="accent-[var(--brand)]" /> Make current</label>
                <Button size="sm">Add season</Button>
              </form>
            </div>
          </Card>

          <Card>
            <CardHeader title="Age groups" />
            <div className="space-y-2 px-5 pb-5">
              {groups.map((g) => (
                <form key={g.id} action={updateAgeGroup.bind(null, g.id)} className="flex items-center gap-2">
                  <input type="color" name="colour" defaultValue={g.colour} className="size-9 shrink-0 cursor-pointer rounded-lg border border-border bg-surface p-0.5" aria-label={`${g.code} colour`} />
                  <span className="w-12 font-semibold">{g.code}</span>
                  <Input name="name" defaultValue={g.name} className="h-9" />
                  <Button size="sm" variant="secondary">Save</Button>
                </form>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
