"use server";

import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { canManageAgeGroup } from "@/lib/access";
import { requireStaff } from "@/lib/auth";
import { calendarUser, type Availability } from "@/lib/calendar-feed";

const ANSWERS: Availability[] = ["available", "maybe", "unavailable"];

/** Reply from a calendar tap link. The token is the credential: no session needed. */
export async function replyFromCalendar(token: string, weekId: string, answer: Availability): Promise<{ ok: boolean; error?: string }> {
  if (!ANSWERS.includes(answer)) return { ok: false, error: "Unknown answer" };
  const found = await calendarUser(token);
  if (!found) return { ok: false, error: "This calendar link is no longer valid." };
  const [w] = await db.select().from(schema.seasonWeeks).where(eq(schema.seasonWeeks.id, weekId));
  if (!w || !canManageAgeGroup(found.ctx, w.ageGroupId)) return { ok: false, error: "Session not found." };
  if (w.status === "cancelled") return { ok: false, error: "This session has been cancelled." };
  await db
    .insert(schema.coachAvailability)
    .values({ seasonWeekId: weekId, userId: found.user.id, status: answer })
    .onConflictDoUpdate({ target: [schema.coachAvailability.seasonWeekId, schema.coachAvailability.userId], set: { status: answer } });
  revalidatePath("/coaches");
  revalidatePath("/season");
  revalidatePath("/");
  return { ok: true };
}

const newToken = () => randomBytes(24).toString("base64url");

/** Create the signed-in user's calendar token if they don't have one yet. */
export async function enableCalendar() {
  const u = await requireStaff();
  const [row] = await db.select({ t: schema.users.calendarToken }).from(schema.users).where(eq(schema.users.id, u.id));
  if (!row?.t) await db.update(schema.users).set({ calendarToken: newToken() }).where(eq(schema.users.id, u.id));
  revalidatePath("/coaches");
}

/** Rotate the token: the old feed and all its reply links stop working. */
export async function resetCalendar() {
  const u = await requireStaff();
  await db.update(schema.users).set({ calendarToken: newToken() }).where(eq(schema.users.id, u.id));
  revalidatePath("/coaches");
}
