"use server";

import { randomBytes } from "node:crypto";
import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";

export type AdminState = { error?: string; ok?: string; link?: string } | undefined;

export async function createInvite(_: AdminState, form: FormData): Promise<AdminState> {
  await requireAdmin();
  const email = String(form.get("email") ?? "").toLowerCase().trim();
  const name = String(form.get("name") ?? "").trim();
  const role = String(form.get("role")) as "admin" | "coach" | "parent";
  if (!email || !name) return { error: "Name and email are required." };
  if (!["admin", "coach", "parent"].includes(role)) return { error: "Choose a role." };
  const token = randomBytes(24).toString("base64url");
  await db.insert(schema.invites).values({ token, email, name, role, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14) });
  revalidatePath("/admin");
  return { ok: `Invite created for ${name}. Send them this link (valid 14 days):`, link: `/invite/${token}` };
}

export async function revokeInvite(token: string) {
  await requireAdmin();
  await db.delete(schema.invites).where(eq(schema.invites.token, token));
  revalidatePath("/admin");
}

export async function updateUser(userId: string, patch: { role?: "admin" | "coach" | "parent"; active?: boolean }) {
  const me = await requireAdmin();
  if (userId === me.id && (patch.active === false || (patch.role && patch.role !== "admin"))) {
    // never lock yourself out
    const others = await db.select({ id: schema.users.id }).from(schema.users).where(and(eq(schema.users.role, "admin"), eq(schema.users.active, true), ne(schema.users.id, me.id)));
    if (!others.length) return;
  }
  await db.update(schema.users).set(patch).where(eq(schema.users.id, userId));
  revalidatePath("/admin");
}

export async function setAssignment(userId: string, ageGroupId: string, role: "head" | "assistant" | null) {
  await requireAdmin();
  if (role === null) {
    await db.delete(schema.coachAssignments).where(and(eq(schema.coachAssignments.userId, userId), eq(schema.coachAssignments.ageGroupId, ageGroupId)));
  } else {
    await db
      .insert(schema.coachAssignments)
      .values({ userId, ageGroupId, role })
      .onConflictDoUpdate({ target: [schema.coachAssignments.userId, schema.coachAssignments.ageGroupId], set: { role } });
  }
  revalidatePath("/admin");
}

export async function updateAgeGroup(id: string, form: FormData) {
  await requireAdmin();
  await db
    .update(schema.ageGroups)
    .set({ name: String(form.get("name")), colour: String(form.get("colour")) })
    .where(eq(schema.ageGroups.id, id));
  revalidatePath("/admin");
}

export async function createSeason(form: FormData) {
  await requireAdmin();
  const name = String(form.get("name") ?? "").trim();
  if (!name) return;
  const current = form.get("current") === "on";
  await db.transaction(async (tx) => {
    if (current) await tx.update(schema.seasons).set({ current: false });
    await tx.insert(schema.seasons).values({ name, startDate: String(form.get("startDate")), endDate: String(form.get("endDate")), current }).onConflictDoNothing();
  });
  revalidatePath("/admin");
}

export async function setCurrentSeason(id: string) {
  await requireAdmin();
  await db.transaction(async (tx) => {
    await tx.update(schema.seasons).set({ current: false });
    await tx.update(schema.seasons).set({ current: true }).where(eq(schema.seasons.id, id));
  });
  revalidatePath("/admin");
  revalidatePath("/season");
}
