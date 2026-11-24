import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Logo } from "@/components/shell/nav";
import { db, schema } from "@/db";
import { canManageAgeGroup } from "@/lib/access";
import { calendarUser, type Availability } from "@/lib/calendar-feed";
import { fmtDate } from "@/lib/utils";
import { ReplyButtons } from "./reply";

export const metadata = { title: "Can you make it?", robots: { index: false } };

export default async function CalendarReply({ params, searchParams }: { params: Promise<{ token: string; weekId: string }>; searchParams: Promise<{ a?: string }> }) {
  const { token, weekId } = await params;
  const { a } = await searchParams;
  const found = await calendarUser(token);
  if (!found) notFound();
  const [row] = await db
    .select({ w: schema.seasonWeeks, code: schema.ageGroups.code, colour: schema.ageGroups.colour, planTitle: schema.sessionPlans.title })
    .from(schema.seasonWeeks)
    .innerJoin(schema.ageGroups, eq(schema.ageGroups.id, schema.seasonWeeks.ageGroupId))
    .leftJoin(schema.sessionPlans, eq(schema.sessionPlans.id, schema.seasonWeeks.sessionPlanId))
    .where(eq(schema.seasonWeeks.id, weekId));
  if (!row || !canManageAgeGroup(found.ctx, row.w.ageGroupId)) notFound();
  const [mine] = await db
    .select({ status: schema.coachAvailability.status })
    .from(schema.coachAvailability)
    .where(and(eq(schema.coachAvailability.seasonWeekId, weekId), eq(schema.coachAvailability.userId, found.user.id)));
  const suggested = (["available", "maybe", "unavailable"] as const).includes(a as Availability) ? (a as Availability) : undefined;

  return (
    <div className="min-h-dvh bg-bg">
      <div className="h-2" style={{ background: row.colour }} />
      <div className="mx-auto max-w-md px-5 pt-8 pb-16">
        <div className="mb-8 flex items-center gap-3">
          <Logo size={40} />
          <div className="font-display text-lg font-bold">Minis Coach</div>
        </div>
        <p className="text-sm text-muted">Hi {found.user.name.split(" ")[0]},</p>
        <h1 className="mt-1 text-2xl font-bold">Can you make it?</h1>
        <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2">
            <span className="rounded-lg px-2 py-0.5 text-sm font-bold text-white" style={{ background: row.colour }}>{row.code}</span>
            <span className="font-semibold">{fmtDate(row.w.date, { weekday: "long", day: "numeric", month: "long" })}</span>
          </div>
          <div className="mt-1 text-sm text-muted">{row.w.startTime}–{row.w.endTime}{row.planTitle && ` · ${row.planTitle}`}</div>
        </div>
        {row.w.status === "cancelled" ? (
          <p className="mt-6 rounded-xl bg-red-500/10 p-4 text-sm">This session has been cancelled, so no reply is needed.</p>
        ) : (
          <ReplyButtons token={token} weekId={weekId} current={(mine?.status as Availability) ?? null} suggested={suggested} />
        )}
      </div>
    </div>
  );
}
