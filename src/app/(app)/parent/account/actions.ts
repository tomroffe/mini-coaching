"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { destroySession, verifyPassword } from "@/lib/auth";
import { canUnenrol, requireAccess } from "@/lib/authz";
import { deleteMedia } from "@/lib/storage";

export type AccountState = { error?: string } | undefined;

/**
 * Unenrol = permanently delete the child's record: attendance, awards and photo go with it
 * (cascading foreign keys). The parent confirms by typing the child's first name.
 */
export async function unenrolChild(playerId: string, _: AccountState, form: FormData): Promise<AccountState> {
  const ctx = await requireAccess(["parent"]);
  const [p] = await db.select().from(schema.players).where(eq(schema.players.id, playerId));
  if (!p || !canUnenrol(ctx, p)) return { error: "You can't unenrol this child." };
  if (String(form.get("confirm") ?? "").trim().toLowerCase() !== p.firstName.trim().toLowerCase()) {
    return { error: `Type ${p.firstName} to confirm.` };
  }
  await db.delete(schema.players).where(eq(schema.players.id, playerId));
  await deleteMedia(p.photoKey);
  revalidatePath("/parent");
  redirect("/parent/account?unenrolled=" + encodeURIComponent(p.firstName));
}

/**
 * Delete the parent's account. Children with no other linked parent are deleted too;
 * children who still have another parent keep their record (only this link is removed).
 */
export async function deleteAccount(_: AccountState, form: FormData): Promise<AccountState> {
  const ctx = await requireAccess(["parent"]);
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, ctx.user.id));
  if (!u?.passwordHash || !(await verifyPassword(u.passwordHash, String(form.get("password") ?? "")))) {
    return { error: "That password isn't right." };
  }

  const photos: (string | null)[] = [];
  await db.transaction(async (tx) => {
    const kids = ctx.childIds.length ? await tx.select().from(schema.players).where(inArray(schema.players.id, ctx.childIds)) : [];
    for (const k of kids) {
      const others = await tx
        .select({ id: schema.playerGuardians.userId })
        .from(schema.playerGuardians)
        .where(and(eq(schema.playerGuardians.playerId, k.id), ne(schema.playerGuardians.userId, u.id)));
      if (!others.length) {
        await tx.delete(schema.players).where(eq(schema.players.id, k.id));
        photos.push(k.photoKey);
      }
    }
    // guardian links cascade; enrolment_links.used_by is set null
    await tx.delete(schema.users).where(eq(schema.users.id, u.id));
  });
  await Promise.all(photos.map((key) => deleteMedia(key)));
  await destroySession();
  redirect("/login?deleted=1");
}
