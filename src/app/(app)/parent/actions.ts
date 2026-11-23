"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { assert, canSetConsent, requireAccess } from "@/lib/authz";
import { deleteMedia } from "@/lib/storage";

/** Parents control their own child's photo consent. Withdrawing deletes any stored photo straight away. */
export async function setPhotoConsent(playerId: string, consent: boolean) {
  const ctx = await requireAccess();
  const [p] = await db.select().from(schema.players).where(eq(schema.players.id, playerId));
  assert(p && canSetConsent(ctx, p));
  if (!consent) await deleteMedia(p.photoKey);
  await db
    .update(schema.players)
    .set({ photoConsent: consent, ...(consent ? {} : { photoKey: null }) })
    .where(eq(schema.players.id, playerId));
  revalidatePath("/parent");
  revalidatePath(`/players/${playerId}`);
}
