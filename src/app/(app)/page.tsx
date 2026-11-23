import { and, asc, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { ArrowRight, CalendarDays, ClipboardCheck, Shapes, Target } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TimelineBar } from "@/components/plan/timeline-bar";
import { Badge, Card, CardHeader, Empty, LinkButton, Stat } from "@/components/ui";
import { db, schema } from "@/db";
import { requireAccess } from "@/lib/authz";
import { fmtDate, todayISO } from "@/lib/utils";
import { MyAvailability } from "./my-availability";

export default async function Dashboard() {
  const ctx = await requireAccess();
  if (ctx.role === "parent") redirect("/parent");
  const today = todayISO();
  const groups = await db.select().from(schema.ageGroups).orderBy(asc(schema.ageGroups.sortOrder));
  const myGroupIds = ctx.role === "admin" && !ctx.ageGroupIds.length ? groups.map((g) => g.id) : ctx.ageGroupIds;

  const upcoming = myGroupIds.length
    ? await db
        .select()
        .from(schema.seasonWeeks)
        .where(and(inArray(schema.seasonWeeks.ageGroupId, myGroupIds), gte(schema.seasonWeeks.date, today), inArray(schema.seasonWeeks.status, ["training", "festival"])))
        .orderBy(asc(schema.seasonWeeks.date))
    : [];
  // first upcoming week per group
  const nextByGroup = new Map<string, (typeof upcoming)[number]>();
  for (const w of upcoming) if (!nextByGroup.has(w.ageGroupId)) nextByGroup.set(w.ageGroupId, w);
  const nexts = [...nextByGroup.values()];
  const planIds = nexts.map((w) => w.sessionPlanId).filter(Boolean) as string[];

  const [plans, myAvail, playerCount, attStats, recentAwards, done] = await Promise.all([
    planIds.length
      ? db.query.sessionPlans.findMany({ where: (p, { inArray }) => inArray(p.id, planIds), with: { blocks: { with: { drill: { columns: { title: true } } }, orderBy: (b, { asc }) => asc(b.order) } } })
      : Promise.resolve([]),
    nexts.length ? db.select().from(schema.coachAvailability).where(and(eq(schema.coachAvailability.userId, ctx.user.id), inArray(schema.coachAvailability.seasonWeekId, nexts.map((w) => w.id)))) : Promise.resolve([]),
    myGroupIds.length ? db.select({ n: sql<number>`count(*)::int` }).from(schema.players).where(and(eq(schema.players.active, true), inArray(schema.players.ageGroupId, myGroupIds))) : Promise.resolve([{ n: 0 }]),
    myGroupIds.length
      ? db
          .select({ present: sql<number>`count(*) filter (where ${schema.attendance.status} <> 'absent')::int`, total: sql<number>`count(*)::int` })
          .from(schema.attendance)
          .innerJoin(schema.seasonWeeks, eq(schema.seasonWeeks.id, schema.attendance.seasonWeekId))
          .where(and(inArray(schema.seasonWeeks.ageGroupId, myGroupIds), gte(schema.seasonWeeks.date, new Date(Date.now() - 28 * 864e5).toISOString().slice(0, 10))))
      : Promise.resolve([{ present: 0, total: 0 }]),
    db
      .select({ id: schema.awards.id, title: schema.awards.title, awardedOn: schema.awards.awardedOn, playerId: schema.players.id, firstName: schema.players.firstName, lastName: schema.players.lastName })
      .from(schema.awards)
      .innerJoin(schema.players, eq(schema.players.id, schema.awards.playerId))
      .where(myGroupIds.length ? inArray(schema.players.ageGroupId, myGroupIds) : sql`false`)
      .orderBy(desc(schema.awards.awardedOn))
      .limit(5),
    myGroupIds.length
      ? db.select({ n: sql<number>`count(*)::int` }).from(schema.seasonWeeks).where(and(inArray(schema.seasonWeeks.ageGroupId, myGroupIds), lt(schema.seasonWeeks.date, today), eq(schema.seasonWeeks.status, "training")))
      : Promise.resolve([{ n: 0 }]),
  ]);
  const gById = new Map(groups.map((g) => [g.id, g]));
  const daysTo = (d: string) => Math.round((new Date(d + "T12:00").getTime() - new Date(today + "T12:00").getTime()) / 864e5);
  const hour = new Date().getHours();
  const att = attStats[0];

  return (
    <>
      <div className="mb-8">
        <p className="text-sm text-muted">{fmtDate(today, { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="text-3xl font-bold">Good {hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"}, {ctx.user.name.split(" ")[0]}</h1>
      </div>

      {myGroupIds.length === 0 && (
        <Empty title="You're not assigned to an age group yet">Ask a club admin to assign you on the Admin page. Meanwhile, explore the <Link href="/drills" className="text-brand underline">drill library</Link>.</Empty>
      )}

      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        {nexts.map((w) => {
          const g = gById.get(w.ageGroupId)!;
          const plan = plans.find((p) => p.id === w.sessionPlanId);
          const n = daysTo(w.date);
          const mine = myAvail.find((a) => a.seasonWeekId === w.id)?.status ?? null;
          return (
            <Card key={w.id} className="overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 text-white" style={{ background: `linear-gradient(120deg, ${g.colour}, ${g.colour}cc)` }}>
                <span className="rounded-lg bg-white/20 px-2 py-0.5 text-sm font-bold">{g.code}</span>
                <span className="font-semibold">{fmtDate(w.date, { weekday: "long", day: "numeric", month: "short" })}</span>
                <span className="text-sm opacity-90">{w.startTime}</span>
                <span className="ml-auto rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">{n === 0 ? "Today" : n === 1 ? "Tomorrow" : `in ${n} days`}</span>
              </div>
              <div className="space-y-4 p-5">
                {w.status === "festival" && <Badge colour="#d97706">Festival{w.notes && ` · ${w.notes}`}</Badge>}
                {plan ? (
                  <>
                    <div>
                      <h2 className="text-lg font-semibold">{plan.title}</h2>
                      {plan.outcome && <p className="mt-0.5 flex items-start gap-1.5 text-sm text-muted"><Target className="mt-0.5 size-4 shrink-0 text-brand" />{plan.outcome}</p>}
                    </div>
                    <TimelineBar startTime={w.startTime} blocks={plan.blocks.map((b) => ({ durationMin: b.durationMin, blockType: b.blockType, title: b.customTitle || b.drill?.title || "" }))} />
                  </>
                ) : (
                  <p className="text-sm text-muted">No plan assigned yet. <Link className="text-brand underline" href={`/season?age=${g.code}`}>Assign one</Link></p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {plan && <LinkButton href={`/sessions/${plan.id}`} size="sm">Open plan <ArrowRight className="size-4" /></LinkButton>}
                  <LinkButton href={`/register/${w.id}`} size="sm" variant="secondary"><ClipboardCheck className="size-4" /> Register</LinkButton>
                  <MyAvailability weekId={w.id} userId={ctx.user.id} current={mine} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Players" value={playerCount[0]?.n ?? 0} hint="in your age groups" />
        <Stat label="Sessions done" value={done[0]?.n ?? 0} hint="this season so far" />
        <Stat label="Attendance" value={att?.total ? `${Math.round((att.present / att.total) * 100)}%` : "–"} hint="last 4 weeks" />
        <Stat label="Upcoming" value={upcoming.length} hint="sessions scheduled" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Recent awards" action={<Link href="/awards" className="text-sm text-brand">All →</Link>} />
          <ul className="space-y-1 px-5 pb-5">
            {recentAwards.length === 0 && <li className="text-sm text-muted">No awards yet.</li>}
            {recentAwards.map((a) => (
              <li key={a.id} className="flex items-center gap-2 text-sm">
                <span>⭐</span>
                <Link href={`/players/${a.playerId}`} className="font-medium hover:text-brand">{a.firstName} {a.lastName}</Link>
                <span className="text-muted">· {a.title}</span>
                <span className="ml-auto text-xs text-muted">{fmtDate(a.awardedOn, { day: "numeric", month: "short" })}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Quick links" />
          <div className="grid grid-cols-2 gap-2 px-5 pb-5">
            {[
              { href: "/season", label: "Season calendar", icon: CalendarDays },
              { href: "/drills", label: "Drill library", icon: Shapes },
              { href: "/drills/new", label: "Create a drill", icon: Shapes },
              { href: "/coaches", label: "Coach availability", icon: ClipboardCheck },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-3 text-sm font-medium transition hover:bg-brand-soft hover:text-brand">
                <l.icon className="size-4" /> {l.label}
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
