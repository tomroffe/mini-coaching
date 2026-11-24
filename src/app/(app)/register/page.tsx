import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { Card, Empty, PageHeader } from "@/components/ui";
import { db, schema } from "@/db";
import { requireAccess } from "@/lib/authz";
import { cn, fmtDate, todayISO } from "@/lib/utils";

export const metadata = { title: "Register" };

export default async function RegisterIndex() {
  const ctx = await requireAccess(["admin", "coach"]);
  const groups = await db.select().from(schema.ageGroups).orderBy(asc(schema.ageGroups.sortOrder));
  const ids = ctx.role === "admin" ? groups.map((g) => g.id) : ctx.ageGroupIds;
  if (!ids.length) return <Empty title="No age group assigned">Ask an admin to assign you to an age group.</Empty>;
  const today = todayISO();
  const from = new Date(Date.now() - 1000 * 60 * 60 * 24 * 35).toISOString().slice(0, 10);
  const to = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().slice(0, 10);
  const weeks = await db
    .select()
    .from(schema.seasonWeeks)
    .where(and(inArray(schema.seasonWeeks.ageGroupId, ids), gte(schema.seasonWeeks.date, from), lte(schema.seasonWeeks.date, to), eq(schema.seasonWeeks.status, "training")))
    .orderBy(asc(schema.seasonWeeks.date));
  const gById = new Map(groups.map((g) => [g.id, g]));

  return (
    <>
      <PageHeader eyebrow="Register" title="Take the register" subtitle="Pick a session. Today's sessions are highlighted." />
      {weeks.length === 0 ? (
        <Empty icon={<ClipboardCheck className="size-8" />} title="No sessions in the last 5 weeks or next 2">Add weeks on the Season page.</Empty>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {weeks.map((w) => {
            const g = gById.get(w.ageGroupId)!;
            const isToday = w.date === today;
            return (
              <Link key={w.id} href={`/register/${w.id}`}>
                <Card className={cn("flex items-center gap-4 p-4 transition hover:shadow-lg", isToday && "border-brand ring-2 ring-brand/30")}>
                  <span className="flex size-12 items-center justify-center rounded-xl text-sm font-bold text-white" style={{ background: g.colour }}>{g.code}</span>
                  <div>
                    <div className="font-semibold">{fmtDate(w.date, { weekday: "long", day: "numeric", month: "long" })}</div>
                    <div className="text-sm text-muted">{isToday ? "Today · " : w.date < today ? "Past · " : "Upcoming · "}{w.startTime}–{w.endTime}</div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
