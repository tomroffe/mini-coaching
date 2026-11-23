"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { assert, canManageAgeGroup, canManagePlayer, canUploadPhoto, requireAccess } from "@/lib/authz";
import { deleteMedia, saveUpload } from "@/lib/storage";

export type ActionState = { error?: string; ok?: string } | undefined;

async function loadPlayer(id: string) {
  const [p] = await db.select().from(schema.players).where(eq(schema.players.id, id));
  assert(p, "Player not found");
  return p;
}

export async function createPlayer(_: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await requireAccess(["admin", "coach"]);
  const ageGroupId = String(form.get("ageGroupId") || "");
  if (!canManageAgeGroup(ctx, ageGroupId)) return { error: "You can only add players to age groups you coach." };
  const firstName = String(form.get("firstName") ?? "").trim();
  const lastName = String(form.get("lastName") ?? "").trim();
  if (!firstName || !lastName) return { error: "First and last name are required." };
  const [p] = await db
    .insert(schema.players)
    .values({ firstName, lastName, ageGroupId, dob: String(form.get("dob") || "") || null, photoConsent: form.get("photoConsent") === "on" })
    .returning();
  revalidatePath("/players");
  redirect(`/players/${p.id}`);
}

export async function updatePlayer(id: string, _: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await requireAccess(["admin", "coach"]);
  const p = await loadPlayer(id);
  assert(canManagePlayer(ctx, p));
  const ageGroupId = String(form.get("ageGroupId") || "") || null;
  if (ageGroupId && ageGroupId !== p.ageGroupId && !canManageAgeGroup(ctx, ageGroupId)) return { error: "You can't move a player into an age group you don't coach." };
  const photoConsent = form.get("photoConsent") === "on";
  // Consent withdrawn: delete the stored photo immediately
  if (!photoConsent && p.photoKey) await deleteMedia(p.photoKey);
  await db
    .update(schema.players)
    .set({
      firstName: String(form.get("firstName") ?? p.firstName).trim(),
      lastName: String(form.get("lastName") ?? p.lastName).trim(),
      dob: String(form.get("dob") || "") || null,
      ageGroupId,
      photoConsent,
      photoKey: photoConsent ? p.photoKey : null,
      medicalNotes: String(form.get("medicalNotes") ?? ""),
      emergencyContact: String(form.get("emergencyContact") ?? ""),
      active: form.getAll("active").includes("on"),
    })
    .where(eq(schema.players.id, id));
  revalidatePath(`/players/${id}`);
  revalidatePath("/players");
  return { ok: "Saved" };
}

export async function uploadPhoto(id: string, _: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await requireAccess(["admin", "coach"]);
  const p = await loadPlayer(id);
  if (!canUploadPhoto(ctx, p)) return { error: "Photo consent must be recorded before a photo can be uploaded." };
  const file = form.get("photo");
  if (!(file instanceof File) || !file.size) return { error: "Choose a photo." };
  if (!file.type.startsWith("image/")) return { error: "Photos must be an image." };
  try {
    const { key } = await saveUpload("players", file, 8 * 1024 * 1024);
    await deleteMedia(p.photoKey);
    await db.update(schema.players).set({ photoKey: key }).where(eq(schema.players.id, id));
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath(`/players/${id}`);
  revalidatePath("/players");
  return { ok: "Photo updated" };
}

export async function removePhoto(id: string) {
  const ctx = await requireAccess(["admin", "coach"]);
  const p = await loadPlayer(id);
  assert(canManagePlayer(ctx, p));
  await deleteMedia(p.photoKey);
  await db.update(schema.players).set({ photoKey: null }).where(eq(schema.players.id, id));
  revalidatePath(`/players/${id}`);
}

export async function deletePlayer(id: string) {
  const ctx = await requireAccess(["admin"]);
  assert(ctx.role === "admin");
  const p = await loadPlayer(id);
  await deleteMedia(p.photoKey);
  await db.delete(schema.players).where(eq(schema.players.id, id));
  revalidatePath("/players");
  redirect("/players");
}

/** Paste CSV: first,last[,dob YYYY-MM-DD][,consent yes/no] */
export async function importPlayers(_: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await requireAccess(["admin", "coach"]);
  const ageGroupId = String(form.get("ageGroupId") || "");
  if (!canManageAgeGroup(ctx, ageGroupId)) return { error: "You can only import into age groups you coach." };
  const rows = String(form.get("csv") ?? "")
    .split(/\r?\n/)
    .map((l) => l.split(",").map((c) => c.trim()))
    .filter((r) => r[0] && r[1] && !/^first/i.test(r[0]));
  if (!rows.length) return { error: "No rows found. Use: first,last,dob,consent" };
  await db.insert(schema.players).values(
    rows.map(([firstName, lastName, dob, consent]) => ({
      firstName,
      lastName,
      ageGroupId,
      dob: /^\d{4}-\d{2}-\d{2}$/.test(dob ?? "") ? dob : null,
      photoConsent: /^(y|yes|true|1)$/i.test(consent ?? ""),
    })),
  );
  revalidatePath("/players");
  return { ok: `Imported ${rows.length} player${rows.length === 1 ? "" : "s"}.` };
}

export async function linkGuardian(playerId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await requireAccess(["admin", "coach"]);
  const p = await loadPlayer(playerId);
  assert(canManagePlayer(ctx, p));
  const email = String(form.get("email") ?? "").toLowerCase().trim();
  const [u] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (!u) return { error: "No account with that email. Invite the parent from Admin → Users first." };
  if (u.role !== "parent") return { error: "That account isn't a parent account." };
  await db.insert(schema.playerGuardians).values({ playerId, userId: u.id }).onConflictDoNothing();
  revalidatePath(`/players/${playerId}`);
  return { ok: `${u.name} linked` };
}

export async function unlinkGuardian(playerId: string, userId: string) {
  const ctx = await requireAccess(["admin", "coach"]);
  const p = await loadPlayer(playerId);
  assert(canManagePlayer(ctx, p));
  await db.delete(schema.playerGuardians).where(and(eq(schema.playerGuardians.playerId, playerId), eq(schema.playerGuardians.userId, userId)));
  revalidatePath(`/players/${playerId}`);
}
