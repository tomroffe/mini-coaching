import { desc, inArray } from "drizzle-orm";
import { CalendarDays, Download } from "lucide-react";
import { Avatar, Badge, Card, CardHeader, Empty, PageHeader } from "@/components/ui";
import { db, schema } from "@/db";
import { requireAccess } from "@/lib/authz";
import { attendanceRates, photoUrl, visiblePlayers } from "@/lib/queries";
import { fmtDate, todayISO } from "@/lib/utils";
import { ConsentToggle } from "./consent";

export const metadata = { title: "My child" };

export default async function ParentPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const ctx = await requireAccess(["parent"]);
  const kids = await visiblePlayers(ctx);
  const { welcome } = await searchParams;
  if (!kids.length) {
    return (
      <>
        <PageHeader title={`Hi ${ctx.user.name.split(" ")[0]}`} />
        <Empty title="No child linked yet">A coach will link your account to your child&apos;s record. Once that&apos;s done you&apos;ll see their sessions, attendance and awards here.</Empty>
      </>
    );
  }
  const ids = kids.map((k) => k.id);
  const groupIds = [...new Set(kids.map((k) => k.ageGroupId).filter(Boolean))] as string[];
  const [groups, rates, awards, nextWeeks] = await Promise.all([
    db.select().from(schema.ageGroups),
    attendanceRates(ids, todayISO()),
    db.select().from(schema.awards).where(inArray(schema.awards.playerId, ids)).orderBy(desc(schema.awards.awardedOn)),
    groupIds.length
      ? db.query.seasonWeeks.findMany({
          where: (w, { and, gte, inArray }) => and(inArray(w.ageGroupId, groupIds), gte(w.date, todayISO())),
          orderBy: (w, { asc }) => asc(w.date),
          limit: 6,
        })
      : Promise.resolve([]),
  ]);
  const plans = nextWeeks.some((w) => w.sessionPlanId)
    ? await db.select({ id: schema.sessionPlans.id, title: schema.sessionPlans.title, outcome: schema.sessionPlans.outcome }).from(schema.sessionPlans).where(inArray(schema.sessionPlans.id, nextWeeks.map((w) => w.sessionPlanId!).filter(Boolean)))
    : [];

  return (
    <>
      <PageHeader eyebrow="Parent view" title={`Hi ${ctx.user.name.split(" ")[0]} 👋`} subtitle="Here's how your child is getting on at minis." />
      {welcome && (
        <Card className="mb-6 border-brand/40 bg-brand-soft p-4">
          <div className="font-semibold">You&apos;re in! 🎉</div>
          <p className="text-sm">{kids.map((k) => k.firstName).join(" and ")} {kids.length === 1 ? "is" : "are"} enrolled. You&apos;ll see sessions, attendance and awards here. Add this page to your home screen for quick access.</p>
        </Card>
      )}
      <div className="space-y-8">
        {kids.map((k) => {
          const g = groups.find((x) => x.id === k.ageGroupId);
          const r = rates.get(k.id);
          const kAwards = awards.filter((a) => a.playerId === k.id);
          const next = nextWeeks.find((w) => w.ageGroupId === k.ageGroupId && w.status !== "cancelled" && w.status !== "no_session");
          const nextPlan = plans.find((p) => p.id === next?.sessionPlanId);
          return (
            <section key={k.id} className="space-y-4">
              <Card className="flex flex-wrap items-center gap-5 p-5">
                <Avatar first={k.firstName} last={k.lastName} src={photoUrl(k)} size={84} colour={g?.colour} />
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">{k.firstName}</h2>
                  {g && <Badge colour={g.colour}>{g.name}</Badge>}
                  <ConsentToggle playerId={k.id} name={k.firstName} consent={k.photoConsent} />
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div><div className="text-3xl font-bold tabular-nums">{r?.sessions ? Math.round((r.present / r.sessions) * 100) : "–"}<span className="text-base">%</span></div><div className="text-xs text-muted">attendance</div></div>
                  <div><div className="text-3xl font-bold tabular-nums">{kAwards.length}</div><div className="text-xs text-muted">awards</div></div>
                </div>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader title="Next session" />
                  <div className="px-5 pb-5">
                    {next ? (
                      <div className="flex gap-3">
                        <CalendarDays className="mt-0.5 size-5 text-brand" />
                        <div>
                          <div className="font-semibold">{fmtDate(next.date, { weekday: "long", day: "numeric", month: "long" })}, {next.startTime}–{next.endTime}</div>
                          {next.status === "festival" && <Badge colour="#d97706">Festival</Badge>}
                          {nextPlan && <p className="mt-1 text-sm">{nextPlan.title.replace(/^Session \d+:\s*/, "")}: <span className="text-muted">{nextPlan.outcome}</span></p>}
                          {next.notes && <p className="text-sm text-muted">{next.notes}</p>}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted">No upcoming sessions scheduled.</p>
                    )}
                  </div>
                </Card>
                <Card>
                  <CardHeader title="Awards" />
                  <div className="space-y-2 px-5 pb-5">
                    {kAwards.length === 0 && <p className="text-sm text-muted">None yet. Keep going!</p>}
                    {kAwards.map((a) => (
                      <a key={a.id} href={`/api/certificate/${a.id}`} className="flex items-center gap-3 rounded-xl bg-surface-2 p-2.5 hover:bg-brand-soft">
                        <span className="text-xl">{a.type === "player_of_week" ? "⭐" : a.type === "badge" ? "🏅" : a.type === "milestone" ? "🎯" : "📜"}</span>
                        <div className="flex-1"><div className="text-sm font-medium">{a.title}</div><div className="text-xs text-muted">{fmtDate(a.awardedOn, { day: "numeric", month: "short", year: "numeric" })}</div></div>
                        <Download className="size-4 text-muted" />
                      </a>
                    ))}
                  </div>
                </Card>
              </div>

            </section>
          );
        })}
      </div>
    </>
  );
}
