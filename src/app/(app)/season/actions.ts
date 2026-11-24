"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { assert, canManageAgeGroup, requireAccess } from "@/lib/authz";
import { cancelAndShift, weekdaysBetween } from "@/lib/season";

async function weekGuard(weekId: string) {
  const ctx = await requireAccess(["admin", "coach"]);
  const [w] = await db.select().from(schema.seasonWeeks).where(eq(schema.seasonWeeks.id, weekId));
  assert(w, "Week not found");
  assert(canManageAgeGroup(ctx, w.ageGroupId), "You can only change weeks for age groups you coach");
  return { ctx, w };
}

export async function updateWeek(weekId: string, patch: { status?: "training" | "cancelled" | "no_session"; sessionPlanId?: string | null; notes?: string; startTime?: string; endTime?: string }) {
  await weekGuard(weekId);
  await db.update(schema.seasonWeeks).set(patch).where(eq(schema.seasonWeeks.id, weekId));
  revalidatePath("/season");
  revalidatePath("/");
}

export async function cancelWeekAndShift(weekId: string): Promise<{ dropped: number }> {
  const { w } = await weekGuard(weekId);
  const weeks = await db
    .select({ id: schema.seasonWeeks.id, date: schema.seasonWeeks.date, status: schema.seasonWeeks.status, planId: schema.seasonWeeks.sessionPlanId })
    .from(schema.seasonWeeks)
    .where(and(eq(schema.seasonWeeks.seasonId, w.seasonId), eq(schema.seasonWeeks.ageGroupId, w.ageGroupId)));
  const { updates, dropped } = cancelAndShift(weeks, weekId);
  await db.transaction(async (tx) => {
    for (const u of updates) await tx.update(schema.seasonWeeks).set({ status: u.status, sessionPlanId: u.planId }).where(eq(schema.seasonWeeks.id, u.id));
  });
  revalidatePath("/season");
  revalidatePath("/");
  return { dropped: dropped.length };
}

export async function generateWeeks(form: FormData) {
  const ctx = await requireAccess(["admin", "coach"]);
  const seasonId = String(form.get("seasonId"));
  const ageGroupId = String(form.get("ageGroupId"));
  assert(canManageAgeGroup(ctx, ageGroupId));
  const from = String(form.get("from"));
  const to = String(form.get("to"));
  const weekday = Number(form.get("weekday") ?? 0);
  const startTime = String(form.get("startTime") || "09:30");
  const endTime = String(form.get("endTime") || "10:15");
  const dates = weekdaysBetween(from, to, weekday);
  if (dates.length) {
    await db
      .insert(schema.seasonWeeks)
      .values(dates.map((date) => ({ seasonId, ageGroupId, date, startTime, endTime })))
      .onConflictDoNothing();
  }
  revalidatePath("/season");
}

export async function addWeek(form: FormData) {
  const ctx = await requireAccess(["admin", "coach"]);
  const ageGroupId = String(form.get("ageGroupId"));
  assert(canManageAgeGroup(ctx, ageGroupId));
  await db
    .insert(schema.seasonWeeks)
    .values({
      seasonId: String(form.get("seasonId")),
      ageGroupId,
      date: String(form.get("date")),
      status: (String(form.get("status") || "training") as "training"),
      notes: String(form.get("notes") ?? ""),
    })
    .onConflictDoNothing();
  revalidatePath("/season");
}

export async function deleteWeek(weekId: string) {
  await weekGuard(weekId);
  await db.delete(schema.seasonWeeks).where(eq(schema.seasonWeeks.id, weekId));
  revalidatePath("/season");
}

/** Assign the age group's plans in sequence order to its training weeks. */
export async function autoAssignSequence(seasonId: string, ageGroupId: string) {
  const ctx = await requireAccess(["admin", "coach"]);
  assert(canManageAgeGroup(ctx, ageGroupId));
  const plans = await db.query.sessionPlans.findMany({
    where: (p, { and, eq, isNotNull }) => and(eq(p.ageGroupId, ageGroupId), isNotNull(p.sequence)),
    orderBy: (p, { asc }) => asc(p.sequence),
  });
  const weeks = await db.query.seasonWeeks.findMany({
    where: (w, { and, eq }) => and(eq(w.seasonId, seasonId), eq(w.ageGroupId, ageGroupId), eq(w.status, "training")),
    orderBy: (w, { asc }) => asc(w.date),
  });
  await db.transaction(async (tx) => {
    for (let i = 0; i < weeks.length; i++) {
      await tx.update(schema.seasonWeeks).set({ sessionPlanId: plans[i]?.id ?? null }).where(eq(schema.seasonWeeks.id, weeks[i].id));
    }
  });
  revalidatePath("/season");
}
