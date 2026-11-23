"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { assert, canManageAgeGroup, requireAccess } from "@/lib/authz";

async function guard(weekId: string) {
  const ctx = await requireAccess(["admin", "coach"]);
  const [w] = await db.select().from(schema.seasonWeeks).where(eq(schema.seasonWeeks.id, weekId));
  assert(w, "Session not found");
  assert(canManageAgeGroup(ctx, w.ageGroupId), "You can only take the register for age groups you coach");
  return { ctx, w };
}

export async function setAttendance(weekId: string, playerId: string, status: "present" | "absent" | "late" | null) {
  const { ctx, w } = await guard(weekId);
  const [p] = await db.select({ ageGroupId: schema.players.ageGroupId }).from(schema.players).where(eq(schema.players.id, playerId));
  assert(p && p.ageGroupId === w.ageGroupId, "Player is not in this age group");
  if (status === null) {
    await db.delete(schema.attendance).where(and(eq(schema.attendance.seasonWeekId, weekId), eq(schema.attendance.playerId, playerId)));
  } else {
    await db
      .insert(schema.attendance)
      .values({ seasonWeekId: weekId, playerId, status, recordedBy: ctx.user.id })
      .onConflictDoUpdate({ target: [schema.attendance.seasonWeekId, schema.attendance.playerId], set: { status, recordedBy: ctx.user.id, recordedAt: new Date() } });
  }
  revalidatePath(`/register/${weekId}`);
}

export async function markAllPresent(weekId: string, playerIds: string[]) {
  const { ctx, w } = await guard(weekId);
  const players = await db.select({ id: schema.players.id }).from(schema.players).where(eq(schema.players.ageGroupId, w.ageGroupId));
  const allowed = new Set(players.map((p) => p.id));
  const ids = playerIds.filter((id) => allowed.has(id));
  if (ids.length) {
    await db
      .insert(schema.attendance)
      .values(ids.map((playerId) => ({ seasonWeekId: weekId, playerId, status: "present" as const, recordedBy: ctx.user.id })))
      .onConflictDoNothing();
  }
  revalidatePath(`/register/${weekId}`);
}

export async function setCoachAttended(weekId: string, userId: string, attended: boolean) {
  await guard(weekId);
  await db
    .insert(schema.coachAttendance)
    .values({ seasonWeekId: weekId, userId, attended })
    .onConflictDoUpdate({ target: [schema.coachAttendance.seasonWeekId, schema.coachAttendance.userId], set: { attended } });
  revalidatePath(`/register/${weekId}`);
  revalidatePath("/coaches");
}
