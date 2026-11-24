import { and, asc, desc, eq, sql } from "drizzle-orm";
import { CalendarDays, CalendarPlus, List, Settings2 } from "lucide-react";
import { MonthCalendar } from "@/components/calendar/month-calendar";
import Link from "next/link";
import { Button, Card, Empty, Field, Input, PageHeader, Select } from "@/components/ui";
import { db, schema } from "@/db";
import { canManageAgeGroup, requireAccess } from "@/lib/authz";
import { SEASON_PATHWAY } from "@/lib/curriculum";
import { cn, todayISO } from "@/lib/utils";
import { addWeek, autoAssignSequence, generateWeeks } from "./actions";
import { AssignSequence } from "./assign-sequence";
import { WeekRow } from "./week-row";

export const metadata = { title: "Season" };

export default async function SeasonPage({ searchParams }: { searchParams: Promise<{ age?: string; season?: string; view?: string }> }) {
  const ctx = await requireAccess(["admin", "coach"]);
  const sp = await searchParams;
  const [seasons, groups] = await Promise.all([
    db.select().from(schema.seasons).orderBy(desc(schema.seasons.startDate)),
    db.select().from(schema.ageGroups).orderBy(asc(schema.ageGroups.sortOrder)),
  ]);
  const season = seasons.find((s) => s.name === sp.season) ?? seasons.find((s) => s.current) ?? seasons[0];
  if (!season) return <Empty title="No season yet">An admin can create a season on the Admin page.</Empty>;

  const myGroups = ctx.role === "admin" ? groups : groups.filter((g) => ctx.ageGroupIds.includes(g.id));
  const group = groups.find((g) => g.code === sp.age) ?? myGroups[0] ?? groups[0];
  const canEdit = canManageAgeGroup(ctx, group.id);

  const [weeks, plans, avail, att, mineRows] = await Promise.all([
    db.query.seasonWeeks.findMany({
      where: (w, { and, eq }) => and(eq(w.seasonId, season.id), eq(w.ageGroupId, group.id)),
      orderBy: (w, { asc }) => asc(w.date),
    }),
    db.select({ id: schema.sessionPlans.id, title: schema.sessionPlans.title, sequence: schema.sessionPlans.sequence, theme: schema.sessionPlans.theme }).from(schema.sessionPlans).where(eq(schema.sessionPlans.ageGroupId, group.id)).orderBy(asc(schema.sessionPlans.sequence), asc(schema.sessionPlans.title)),
    db
      .select({ weekId: schema.coachAvailability.seasonWeekId, n: sql<number>`count(*)::int` })
      .from(schema.coachAvailability)
      .innerJoin(schema.seasonWeeks, eq(schema.seasonWeeks.id, schema.coachAvailability.seasonWeekId))
      .where(and(eq(schema.seasonWeeks.ageGroupId, group.id), eq(schema.coachAvailability.status, "available")))
      .groupBy(schema.coachAvailability.seasonWeekId),
    db
      .select({ weekId: schema.attendance.seasonWeekId, n: sql<number>`count(*) filter (where ${schema.attendance.status} <> 'absent')::int` })
      .from(schema.attendance)
      .innerJoin(schema.seasonWeeks, eq(schema.seasonWeeks.id, schema.attendance.seasonWeekId))
      .where(eq(schema.seasonWeeks.ageGroupId, group.id))
      .groupBy(schema.attendance.seasonWeekId),
    db
      .select({ weekId: schema.coachAvailability.seasonWeekId, status: schema.coachAvailability.status })
      .from(schema.coachAvailability)
      .innerJoin(schema.seasonWeeks, eq(schema.seasonWeeks.id, schema.coachAvailability.seasonWeekId))
      .where(and(eq(schema.seasonWeeks.ageGroupId, group.id), eq(schema.coachAvailability.userId, ctx.user.id))),
  ]);
  const mineBy = new Map(mineRows.map((m) => [m.weekId, m.status]));
  const view = sp.view === "calendar" ? "calendar" : "list";
  const viewHref = (v: string) => `/season?age=${group.code}&season=${season.name}${v === "calendar" ? "&view=calendar" : ""}`;
  const availBy = new Map(avail.map((a) => [a.weekId, a.n]));
  const attBy = new Map(att.map((a) => [a.weekId, a.n]));
  const today = todayISO();
  const nextId = weeks.find((w) => w.date >= today && w.status !== "cancelled")?.id;

  const byMonth = new Map<string, typeof weeks>();
  for (const w of weeks) {
    const k = w.date.slice(0, 7);
    byMonth.set(k, [...(byMonth.get(k) ?? []), w]);
  }
  const trainingCount = weeks.filter((w) => w.status === "training").length;

  return (
    <>
      <PageHeader
        eyebrow={`Season ${season.name}`}
        title="Season calendar"
        subtitle="Sunday sessions with their assigned plan. Cancelled a week? Shift the sequence forward so no learning objective is skipped."
        actions={
          seasons.length > 1 && (
            <form className="flex gap-2">
              <input type="hidden" name="age" value={group.code} />
              <Select name="season" defaultValue={season.name} className="w-32">
                {seasons.map((s) => <option key={s.id}>{s.name}</option>)}
              </Select>
              <Button variant="secondary">Go</Button>
            </form>
          )
        }
      />

      <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto scroll-px-4 px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&>*]:shrink-0">
        {groups.map((g) => (
          <Link
            key={g.id}
            href={`/season?age=${g.code}&season=${season.name}`}
            className={cn("flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium", g.id === group.id ? "border-transparent text-white" : "border-border bg-surface text-muted hover:text-text")}
            style={g.id === group.id ? { background: g.colour } : undefined}
          >
            {g.code}
            {ctx.ageGroupIds.includes(g.id) && g.id !== group.id && <span className="size-1.5 rounded-full bg-brand" />}
          </Link>
        ))}
      </div>

      {group.code === "U6" && (
        <div className="-mx-4 mb-6 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0">
          {SEASON_PATHWAY.map((p) => (
            <div key={p.period} className="w-56 shrink-0 snap-start rounded-xl border border-border bg-surface p-3 sm:w-auto">
              <div className="text-xs font-semibold text-brand">{p.period}</div>
              <div className="font-semibold">{p.theme}</div>
              <div className="mt-0.5 text-xs text-muted">{p.outcomes}</div>
            </div>
          ))}
        </div>
      )}

      {weeks.length === 0 ? (
        <Card className="p-6">
          <h2 className="mb-1 text-lg font-semibold">No sessions scheduled for {group.name} yet</h2>
          <p className="mb-4 text-sm text-muted">Generate a week for every training day between two dates. You can mark cancellations and days off afterwards.</p>
          {canEdit ? <GenerateForm seasonId={season.id} ageGroupId={group.id} from={season.startDate} to={season.endDate} /> : <p className="text-sm">Ask an admin or the {group.code} coach to set this up.</p>}
        </Card>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              {trainingCount} training · {weeks.filter((w) => w.status === "cancelled").length} cancelled · {weeks.filter((w) => w.status === "no_session").length} no session
            </p>
            <div className="inline-flex rounded-full border border-border bg-surface p-0.5 text-sm" role="tablist" aria-label="View">
              {(["list", "calendar"] as const).map((v) => (
                <Link
                  key={v}
                  href={viewHref(v)}
                  role="tab"
                  aria-selected={view === v}
                  className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium", view === v ? "bg-brand text-brand-fg" : "text-muted hover:text-text")}
                >
                  {v === "list" ? <List className="size-4" /> : <CalendarDays className="size-4" />} {v === "list" ? "List" : "Calendar"}
                </Link>
              ))}
            </div>
          </div>
          {view === "calendar" && (
            <Card className="p-4 sm:p-5">
              <MonthCalendar
                today={today}
                showMine
                showTitles
                events={weeks.map((w) => {
                  const p = plans.find((x) => x.id === w.sessionPlanId);
                  return { weekId: w.id, date: w.date, start: w.startTime, status: w.status, code: group.code, colour: group.colour, planId: p?.id ?? null, planTitle: p?.title ?? null, mine: mineBy.get(w.id) ?? null };
                })}
              />
            </Card>
          )}
          {view === "list" && (
          <div className="space-y-8">
            {[...byMonth.entries()].map(([month, ws]) => (
              <section key={month}>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">
                  {new Date(month + "-15").toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
                </h2>
                <div className="space-y-2">
                  {ws.map((w) => (
                    <WeekRow
                      key={w.id}
                      week={w}
                      plans={plans}
                      isNext={w.id === nextId}
                      isPast={w.date < today}
                      available={availBy.get(w.id) ?? 0}
                      attended={attBy.get(w.id)}
                      canEdit={canEdit}
                      colour={group.colour}
                      userId={ctx.user.id}
                      mine={mineBy.get(w.id) ?? null}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
          )}
          {canEdit && (
            <details className="mt-8 rounded-2xl border border-border bg-surface p-4">
              <summary className="cursor-pointer font-semibold"><Settings2 className="mr-1 inline size-4" /> Season tools</summary>
              <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
                <form action={addWeek} className="space-y-3">
                  <input type="hidden" name="seasonId" value={season.id} />
                  <input type="hidden" name="ageGroupId" value={group.id} />
                  <div className="text-sm font-semibold"><CalendarPlus className="mr-1 inline size-4" /> Add a single date</div>
                  <div className="flex gap-2">
                    <Input type="date" name="date" required aria-label="Date" />
                    <Select name="status" className="w-36" aria-label="Status">
                      <option value="training">Training</option>
                      <option value="no_session">No session</option>
                    </Select>
                  </div>
                  <Input name="notes" placeholder="Notes, e.g. venue" />
                  <Button size="sm">Add date</Button>
                </form>
                <div>
                  <div className="mb-3 text-sm font-semibold"><CalendarPlus className="mr-1 inline size-4" /> Fill a range</div>
                  <GenerateForm seasonId={season.id} ageGroupId={group.id} from={season.startDate} to={season.endDate} />
                </div>
                {plans.some((p) => p.sequence) && (
                  <div className="space-y-2 border-t border-border pt-4 md:col-span-2">
                    <div className="text-sm font-semibold">Assign plans in order</div>
                    <p className="text-sm text-muted">
                      Puts {group.code}&apos;s numbered plans onto the training weeks in order (plan 1 on the first training week, and so on). Useful after adding weeks. It replaces any plans already assigned.
                    </p>
                    <AssignSequence action={autoAssignSequence.bind(null, season.id, group.id)} count={plans.filter((p) => p.sequence).length} group={group.code} />
                  </div>
                )}
              </div>
            </details>
          )}
        </>
      )}
    </>
  );
}

function GenerateForm({ seasonId, ageGroupId, from, to }: { seasonId: string; ageGroupId: string; from: string; to: string }) {
  return (
    <form action={generateWeeks} className="grid max-w-xl grid-cols-2 gap-3">
      <input type="hidden" name="seasonId" value={seasonId} />
      <input type="hidden" name="ageGroupId" value={ageGroupId} />
      <Field label="From"><Input type="date" name="from" defaultValue={from} required /></Field>
      <Field label="To"><Input type="date" name="to" defaultValue={to} required /></Field>
      <Field label="Day">
        <Select name="weekday" defaultValue="0">
          {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d, i) => <option key={d} value={i}>{d}</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Start"><Input type="time" name="startTime" defaultValue="09:30" /></Field>
        <Field label="End"><Input type="time" name="endTime" defaultValue="10:15" /></Field>
      </div>
      <Button className="col-span-2 justify-self-start"><CalendarPlus className="size-4" /> Generate weeks</Button>
    </form>
  );
}
