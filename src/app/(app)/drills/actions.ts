"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { assert, canEditLibrary, requireAccess } from "@/lib/authz";
import { diagramSchema } from "@/lib/diagram";
import { deleteMedia, saveUpload } from "@/lib/storage";
import { csv, lines, slugify, videoEmbed } from "@/lib/utils";

export type DrillFormState = { error?: string } | undefined;

export async function saveDrill(drillId: string | null, _: DrillFormState, form: FormData): Promise<DrillFormState> {
  const ctx = await requireAccess(["admin", "coach"]);
  assert(canEditLibrary(ctx));

  const title = String(form.get("title") ?? "").trim();
  if (!title) return { error: "Give the drill a title." };

  let diagram;
  try {
    diagram = diagramSchema.parse(JSON.parse(String(form.get("diagram") ?? "null")));
  } catch {
    return { error: "The diagram data is invalid." };
  }

  // Unique slug
  let slug = slugify(title) || "drill";
  for (let i = 2; ; i++) {
    const clash = await db
      .select({ id: schema.drills.id })
      .from(schema.drills)
      .where(drillId ? and(eq(schema.drills.slug, slug), ne(schema.drills.id, drillId)) : eq(schema.drills.slug, slug));
    if (!clash.length) break;
    slug = `${slugify(title)}-${i}`;
  }

  const values = {
    title,
    slug,
    category: String(form.get("category") ?? "skill"),
    ageGroups: form.getAll("ageGroups").map(String),
    durationMin: Number(form.get("durationMin") ?? 10) || 10,
    minPlayers: Number(form.get("minPlayers") ?? 2) || 2,
    area: String(form.get("area") ?? ""),
    equipment: csv(form.get("equipment")),
    summary: String(form.get("summary") ?? ""),
    setup: String(form.get("setup") ?? ""),
    howToRun: String(form.get("howToRun") ?? ""),
    coachingCues: lines(form.get("coachingCues")),
    progressions: lines(form.get("progressions")),
    regressions: lines(form.get("regressions")),
    safetyNotes: String(form.get("safetyNotes") ?? ""),
    tags: csv(form.get("tags")).map((t) => t.toLowerCase()),
    diagram,
    updatedAt: new Date(),
  };

  if (drillId) {
    await db.update(schema.drills).set(values).where(eq(schema.drills.id, drillId));
  } else {
    await db.insert(schema.drills).values({ ...values, createdBy: ctx.user.id });
  }
  revalidatePath("/drills");
  redirect(`/drills/${slug}`);
}

export async function deleteDrill(drillId: string) {
  const ctx = await requireAccess(["admin", "coach"]);
  assert(ctx.role === "admin", "Only admins can delete drills");
  const media = await db.select().from(schema.drillMedia).where(eq(schema.drillMedia.drillId, drillId));
  await Promise.all(media.map((m) => deleteMedia(m.storageKey)));
  await db.delete(schema.drills).where(eq(schema.drills.id, drillId));
  revalidatePath("/drills");
  redirect("/drills");
}

export async function addDrillMedia(drillId: string, slug: string, _: DrillFormState, form: FormData): Promise<DrillFormState> {
  const ctx = await requireAccess(["admin", "coach"]);
  assert(canEditLibrary(ctx));
  const caption = String(form.get("caption") ?? "");
  const url = String(form.get("url") ?? "").trim();
  const file = form.get("file");

  try {
    if (file instanceof File && file.size > 0) {
      const isVideo = file.type.startsWith("video/");
      const { key, mime } = await saveUpload("drills", file, isVideo ? 200 * 1024 * 1024 : 15 * 1024 * 1024);
      await db.insert(schema.drillMedia).values({ drillId, type: isVideo ? "upload" : "image", storageKey: key, mime, caption });
    } else if (url) {
      if (!/^https?:\/\//.test(url)) return { error: "Links must start with http:// or https://" };
      const v = videoEmbed(url);
      await db.insert(schema.drillMedia).values({ drillId, type: v ? v.type : "link", url: v ? v.embed : url, caption });
    } else {
      return { error: "Paste a link or choose a file." };
    }
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath(`/drills/${slug}`);
  return {};
}

export async function removeDrillMedia(mediaId: string, slug: string) {
  const ctx = await requireAccess(["admin", "coach"]);
  assert(canEditLibrary(ctx));
  const [m] = await db.delete(schema.drillMedia).where(eq(schema.drillMedia.id, mediaId)).returning();
  await deleteMedia(m?.storageKey);
  revalidatePath(`/drills/${slug}`);
}
