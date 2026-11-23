import { and, asc, eq, gte, inArray, sql } from "drizzle-orm";
import Link from "next/link";
import { Card, CardHeader, Empty, PageHeader } from "@/components/ui";
import { db, schema } from "@/db";
import { requireAccess } from "@/lib/authz";
import { cn, todayISO } from "@/lib/utils";
import { AvailabilityGrid } from "./grid";

export const metadata = { title: "Coaches" };

export default async function CoachesPage({ searchParams }: { searchParams: Promise<{ age?: string; week?: string }> }) {
  const ctx = await requireAccess(["admin", "coach"]);
  const sp = await searchParams;
  const groups = await db.select().from(schema.ageGroups).orderBy(asc(schema.ageGroups.sortOrder));
  let focusWeek: { ageGroupId: string; date: string } | undefined;
  if (sp.week) [focusWeek] = await db.select({ ageGroupId: schema.seasonWeeks.ageGroupId, date: schema.seasonWeeks.date }).from(schema.seasonWeeks).where(eq(schema.seasonWeeks.id, sp.week));
  const group =
    groups.find((g) => g.id === focusWeek?.ageGroupId) ??
    groups.find((g) => g.code === sp.age) ??
    groups.find((g) => ctx.ageGroupIds.includes(g.id)) ??
    groups[0];
  if (!group) return <Empty title="No age groups" />;

  const from = focusWeek && focusWeek.date < todayISO() ? focusWeek.date : todayISO();
  const [weeks, assigned, allStaff] = await Promise.all([
    db
      .select()
      .from(schema.seasonWeeks)
      .where(and(eq(schema.seasonWeeks.ageGroupId, group.id), gte(schema.seasonWeeks.date, from), inArray(schema.seasonWeeks.status, ["training", "festival"])))
      .orderBy(asc(schema.seasonWeeks.date))
      .limit(10),
    db
      .select({ id: schema.users.id, name: schema.users.name, role: schema.coachAssignments.role })
      .from(schema.coachAssignments)
      .innerJoin(schema.users, eq(schema.users.id, schema.coachAssignments.userId))
      .where(and(eq(schema.coachAssignments.ageGroupId, group.id), eq(schema.users.active, true))),
    db.select({ id: schema.users.id, name: schema.users.name }).from(schema.users).where(and(inArray(schema.users.role, ["admin", "coach"]), eq(schema.users.active, true))),
  ]);
  const weekIds = weeks.map((w) => w.id);
  const avail = weekIds.length ? await db.select().from(schema.coachAvailability).where(inArray(schema.coachAvailability.seasonWeekId, weekIds)) : [];

  // Coaches shown: assigned to the group, plus me, plus anyone who has given availability for these weeks
  const ids = new Set([...assigned.map((a) => a.id), ctx.user.id, ...avail.map((a) => a.userId)]);
  const coaches = allStaff
    .filter((u) => ids.has(u.id))
    .map((u) => ({ ...u, head: assigned.find((a) => a.id === u.id)?.role === "head", assigned: assigned.some((a) => a.id === u.id) }))
    .sort((a, b) => Number(b.head) - Number(a.head) || Number(b.assigned) - Number(a.assigned) || a.name.localeCompare(b.name));

  // Season attendance tally
  const tally = await db
    .select({ userId: schema.coachAttendance.userId, n: sql<number>`count(*) filter (where ${schema.coachAttendance.attended})::int` })
    .from(schema.coachAttendance)
    .innerJoin(schema.seasonWeeks, eq(schema.seasonWeeks.id, schema.coachAttendance.seasonWeekId))
    .where(eq(schema.seasonWeeks.ageGroupId, group.id))
    .groupBy(schema.coachAttendance.userId);
  const tallyBy = new Map(tally.map((t) => [t.userId, t.n]));

  return (
    <>
      <PageHeader eyebrow="Coaches" title="Availability" subtitle="Tap your row to say whether you can make each session. Columns turn amber when fewer than two coaches are available." />
      <div className="mb-6 flex flex-wrap gap-2">
        {groups.map((g) => (
          <Link
            key={g.id}
            href={`/coaches?age=${g.code}`}
            className={cn("rounded-full border px-3 py-1 text-sm font-medium", g.id === group.id ? "border-transparent text-white" : "border-border bg-surface text-muted")}
            style={g.id === group.id ? { background: g.colour } : undefined}
          >
            {g.code}
          </Link>
        ))}
      </div>
      {weeks.length === 0 ? (
        <Empty title="No upcoming sessions">Add weeks for {group.code} on the Season page.</Empty>
      ) : (
        <AvailabilityGrid
          me={ctx.user.id}
          isAdmin={ctx.role === "admin"}
          focusWeekId={sp.week}
          weeks={weeks.map((w) => ({ id: w.id, date: w.date, status: w.status }))}
          coaches={coaches}
          availability={avail.map((a) => ({ weekId: a.seasonWeekId, userId: a.userId, status: a.status }))}
        />
      )}

      <Card className="mt-8">
        <CardHeader title={`${group.code} coaching team`} subtitle="Sessions attended this season (recorded on the register)." />
        <div className="grid gap-2 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-3">
          {coaches.filter((c) => c.assigned).length === 0 && <p className="text-sm text-muted">No coaches assigned. Admins can assign coaches on the Admin page.</p>}
          {coaches.filter((c) => c.assigned).map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2">
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-muted">{c.head ? "Head coach" : "Assistant coach"}</div>
              </div>
              <div className="text-right"><div className="text-lg font-bold tabular-nums">{tallyBy.get(c.id) ?? 0}</div><div className="text-[10px] text-muted">sessions</div></div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
