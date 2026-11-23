"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { assert, canManagePlayer, requireAccess } from "@/lib/authz";
import { todayISO } from "@/lib/utils";

export type AwardState = { error?: string; ok?: string; awardId?: string } | undefined;

const TYPES = ["player_of_week", "certificate", "badge", "milestone"] as const;

export async function giveAward(_: AwardState, form: FormData): Promise<AwardState> {
  const ctx = await requireAccess(["admin", "coach"]);
  const playerIds = form.getAll("playerId").map(String).filter(Boolean);
  if (!playerIds.length) return { error: "Choose at least one player." };
  const type = String(form.get("type")) as (typeof TYPES)[number];
  if (!TYPES.includes(type)) return { error: "Choose an award type." };
  const title = String(form.get("title") ?? "").trim();
  if (!title) return { error: "Give the award a title." };

  const players = await db.select().from(schema.players).where(eq(schema.players.active, true));
  const allowed = players.filter((p) => playerIds.includes(p.id) && canManagePlayer(ctx, p));
  if (allowed.length !== playerIds.length) return { error: "You can only give awards to players in age groups you coach." };

  const rows = await db
    .insert(schema.awards)
    .values(
      allowed.map((p) => ({
        playerId: p.id,
        type,
        title,
        reason: String(form.get("reason") ?? ""),
        awardedOn: String(form.get("awardedOn") || todayISO()),
        awardedBy: ctx.user.id,
      })),
    )
    .returning({ id: schema.awards.id });
  revalidatePath("/awards");
  for (const p of allowed) revalidatePath(`/players/${p.id}`);
  return { ok: `Awarded to ${allowed.map((p) => p.firstName).join(", ")}!`, awardId: rows.length === 1 ? rows[0].id : undefined };
}

export async function deleteAward(id: string) {
  const ctx = await requireAccess(["admin", "coach"]);
  const [a] = await db.select().from(schema.awards).where(eq(schema.awards.id, id));
  if (!a) return;
  const [p] = await db.select().from(schema.players).where(eq(schema.players.id, a.playerId));
  assert(p && canManagePlayer(ctx, p));
  await db.delete(schema.awards).where(eq(schema.awards.id, id));
  revalidatePath("/awards");
}
