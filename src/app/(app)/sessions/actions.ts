"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { assert, canEditLibrary, requireAccess } from "@/lib/authz";

const blockSchema = z.object({
  durationMin: z.number().int().min(1).max(60),
  blockType: z.enum(["arrival", "skill", "water", "challenge", "game"]),
  drillId: z.string().uuid().nullable(),
  customTitle: z.string().max(120),
  coachFocus: z.string().max(2000),
});

const planSchema = z.object({
  title: z.string().trim().min(1, "Give the plan a title").max(160),
  ageGroupId: z.string().uuid().nullable(),
  theme: z.string().max(160),
  outcome: z.string().max(500),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  equipment: z.string().max(1000),
  checkpoint: z.string().max(1000),
  notes: z.string().max(5000),
  blocks: z.array(blockSchema).max(20),
});

export type PlanInput = z.infer<typeof planSchema>;

export async function savePlan(planId: string, input: PlanInput): Promise<{ error?: string }> {
  const ctx = await requireAccess(["admin", "coach"]);
  assert(canEditLibrary(ctx));
  const parsed = planSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid plan" };
  const { blocks, ...plan } = parsed.data;
  const durationMin = blocks.reduce((s, b) => s + b.durationMin, 0);
  await db.transaction(async (tx) => {
    await tx.update(schema.sessionPlans).set({ ...plan, durationMin, updatedAt: new Date() }).where(eq(schema.sessionPlans.id, planId));
    await tx.delete(schema.sessionBlocks).where(eq(schema.sessionBlocks.planId, planId));
    if (blocks.length) await tx.insert(schema.sessionBlocks).values(blocks.map((b, i) => ({ ...b, planId, order: i })));
  });
  revalidatePath("/sessions");
  revalidatePath(`/sessions/${planId}`);
  return {};
}

const DEFAULT_BLOCKS = [
  { durationMin: 7, blockType: "arrival" as const, customTitle: "Fun arrival game", coachFocus: "Fun start; high movement and minimal instruction." },
  { durationMin: 10, blockType: "skill" as const, customTitle: "Skill activity 1", coachFocus: "Introduce or revisit the main technical skill." },
  { durationMin: 10, blockType: "skill" as const, customTitle: "Skill activity 2", coachFocus: "Add movement, choice or light opposition." },
  { durationMin: 2, blockType: "water" as const, customTitle: "Water break", coachFocus: "Drinks and a quick breather. Ask one question: What helps the team?" },
  { durationMin: 4, blockType: "challenge" as const, customTitle: "Challenge", coachFocus: "Quick conditioned challenge: a 60-90 second repeat with one condition." },
  { durationMin: 12, blockType: "game" as const, customTitle: "Fun finishing game", coachFocus: "Free-flowing finish. Coach only safety, one core rule and the session objective." },
];

export async function createPlan(form: FormData) {
  const ctx = await requireAccess(["admin", "coach"]);
  assert(canEditLibrary(ctx));
  const ageGroupId = String(form.get("ageGroupId") || "") || null;
  const [plan] = await db
    .insert(schema.sessionPlans)
    .values({ title: "New session plan", ageGroupId, equipment: "Size 3 balls, cones, bibs, whistle" })
    .returning();
  await db.insert(schema.sessionBlocks).values(DEFAULT_BLOCKS.map((b, i) => ({ ...b, planId: plan.id, order: i })));
  redirect(`/sessions/${plan.id}/edit`);
}

export async function duplicatePlan(planId: string, form: FormData) {
  const ctx = await requireAccess(["admin", "coach"]);
  assert(canEditLibrary(ctx));
  const src = await db.query.sessionPlans.findFirst({ where: eq(schema.sessionPlans.id, planId), with: { blocks: true } });
  if (!src) return;
  const ageGroupId = String(form.get("ageGroupId") || "") || src.ageGroupId;
  const { id: _id, createdAt: _c, updatedAt: _u, blocks, ...rest } = src;
  const [copy] = await db
    .insert(schema.sessionPlans)
    .values({ ...rest, ageGroupId, title: `${src.title} (copy)`, sequence: null })
    .returning();
  if (blocks.length) {
    await db.insert(schema.sessionBlocks).values(blocks.map(({ id: _b, planId: _p, ...b }) => ({ ...b, planId: copy.id })));
  }
  redirect(`/sessions/${copy.id}/edit`);
}

export async function deletePlan(planId: string) {
  const ctx = await requireAccess(["admin", "coach"]);
  assert(canEditLibrary(ctx));
  await db.delete(schema.sessionPlans).where(eq(schema.sessionPlans.id, planId));
  revalidatePath("/sessions");
  redirect("/sessions");
}
