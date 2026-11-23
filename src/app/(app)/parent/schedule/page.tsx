import { inArray } from "drizzle-orm";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";
import { db, schema } from "@/db";
import { requireAccess } from "@/lib/authz";
import { visiblePlayers } from "@/lib/queries";
import { cn, fmtDate, todayISO } from "@/lib/utils";

export const metadata = { title: "Schedule" };

export default async function ParentSchedule() {
  const ctx = await requireAccess(["parent"]);
  const kids = await visiblePlayers(ctx);
  const groupIds = [...new Set(kids.map((k) => k.ageGroupId).filter(Boolean))] as string[];
  if (!groupIds.length) return <Empty title="No child linked yet" />;
  const [groups, weeks] = await Promise.all([
    db.select().from(schema.ageGroups).where(inArray(schema.ageGroups.id, groupIds)),
    db.query.seasonWeeks.findMany({ where: (w, { inArray }) => inArray(w.ageGroupId, groupIds), orderBy: (w, { asc }) => asc(w.date) }),
  ]);
  const planIds = weeks.map((w) => w.sessionPlanId).filter(Boolean) as string[];
  const plans = planIds.length ? await db.select({ id: schema.sessionPlans.id, title: schema.sessionPlans.title }).from(schema.sessionPlans).where(inArray(schema.sessionPlans.id, planIds)) : [];
  const today = todayISO();

  return (
    <>
      <PageHeader eyebrow="Parent view" title="Training schedule" subtitle="Sessions, festivals and any cancellations." />
      <div className="space-y-2">
        {weeks.map((w) => {
          const g = groups.find((x) => x.id === w.ageGroupId)!;
          const plan = plans.find((p) => p.id === w.sessionPlanId);
          return (
            <Card key={w.id} className={cn("flex items-center gap-4 p-3", w.date < today && "opacity-50", (w.status === "cancelled" || w.status === "no_session") && "line-through opacity-50")}>
              <span className="w-24 shrink-0 text-sm font-semibold">{fmtDate(w.date)}</span>
              <Badge colour={g.colour}>{g.code}</Badge>
              <span className="text-sm text-muted">{w.startTime}–{w.endTime}</span>
              <span className="flex-1 truncate text-sm">{w.status === "festival" ? "🏆 Festival" : w.status === "cancelled" ? "Cancelled" : w.status === "no_session" ? "No session" : plan?.title.replace(/^Session \d+:\s*/, "") ?? "Training"}</span>
              {w.notes && <span className="hidden text-xs text-muted sm:inline">{w.notes}</span>}
            </Card>
          );
        })}
      </div>
    </>
  );
}
