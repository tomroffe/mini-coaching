"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { assert, requireAccess } from "@/lib/authz";

export async function setAvailability(weekId: string, userId: string, status: "available" | "maybe" | "unavailable" | null) {
  const ctx = await requireAccess(["admin", "coach"]);
  assert(ctx.role === "admin" || ctx.user.id === userId, "You can only set your own availability");
  if (status === null) {
    await db.delete(schema.coachAvailability).where(and(eq(schema.coachAvailability.seasonWeekId, weekId), eq(schema.coachAvailability.userId, userId)));
  } else {
    await db
      .insert(schema.coachAvailability)
      .values({ seasonWeekId: weekId, userId, status })
      .onConflictDoUpdate({ target: [schema.coachAvailability.seasonWeekId, schema.coachAvailability.userId], set: { status } });
  }
  revalidatePath("/coaches");
  revalidatePath("/");
}
