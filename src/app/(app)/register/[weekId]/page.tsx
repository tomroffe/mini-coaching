import { eq, inArray, or } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { canManageAgeGroup, requireAccess } from "@/lib/authz";
import { photoUrl } from "@/lib/queries";
import { fmtDate } from "@/lib/utils";
import { CoachRegister, PlayerRegister } from "./register";

export const metadata = { title: "Register" };

export default async function RegisterPage({ params }: { params: Promise<{ weekId: string }> }) {
  const ctx = await requireAccess(["admin", "coach"]);
  const { weekId } = await params;
  const week = await db.query.seasonWeeks.findFirst({ where: (w, { eq }) => eq(w.id, weekId) });
  if (!week || !canManageAgeGroup(ctx, week.ageGroupId)) notFound();
  const [group] = await db.select().from(schema.ageGroups).where(eq(schema.ageGroups.id, week.ageGroupId));

  const [players, att, assigned, avail, coachAtt, plan] = await Promise.all([
    db.select().from(schema.players).where(eq(schema.players.ageGroupId, week.ageGroupId)).orderBy(schema.players.firstName),
    db.select().from(schema.attendance).where(eq(schema.attendance.seasonWeekId, weekId)),
    db.select({ userId: schema.coachAssignments.userId }).from(schema.coachAssignments).where(eq(schema.coachAssignments.ageGroupId, week.ageGroupId)),
    db.select().from(schema.coachAvailability).where(eq(schema.coachAvailability.seasonWeekId, weekId)),
    db.select().from(schema.coachAttendance).where(eq(schema.coachAttendance.seasonWeekId, weekId)),
    week.sessionPlanId ? db.query.sessionPlans.findFirst({ where: (p, { eq }) => eq(p.id, week.sessionPlanId!) }) : Promise.resolve(undefined),
  ]);
  const coachIds = [...new Set([...assigned.map((a) => a.userId), ...avail.map((a) => a.userId), ...coachAtt.map((a) => a.userId)])];
  const coaches = coachIds.length
    ? await db.select({ id: schema.users.id, name: schema.users.name }).from(schema.users).where(or(inArray(schema.users.id, coachIds)))
    : [];
  const attBy = new Map(att.map((a) => [a.playerId, a.status]));
  const active = players.filter((p) => p.active || attBy.has(p.id));

  return (
    <>
      <Link href="/register" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-text"><ArrowLeft className="size-4" /> Sessions</Link>
      <div className="mb-5">
        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: group.colour }}>{group.name} register</div>
        <h1 className="text-2xl font-bold">{fmtDate(week.date, { weekday: "long", day: "numeric", month: "long" })}</h1>
        {plan && <Link href={`/sessions/${plan.id}`} className="text-sm text-brand hover:underline">{plan.title}</Link>}
      </div>
      <PlayerRegister
        weekId={weekId}
        colour={group.colour}
        players={active.map((p) => ({ id: p.id, firstName: p.firstName, lastName: p.lastName, photo: photoUrl(p), medical: !!p.medicalNotes, status: attBy.get(p.id) ?? null }))}
      />
      <CoachRegister
        weekId={weekId}
        coaches={coaches.map((c) => ({
          ...c,
          availability: avail.find((a) => a.userId === c.id)?.status ?? null,
          attended: coachAtt.find((a) => a.userId === c.id)?.attended ?? null,
        }))}
      />
    </>
  );
}
