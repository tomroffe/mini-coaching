/**
 * Idempotent seed: safe to run on every start-up. Inserts only what is missing and
 * never overwrites edits made in the app.
 */
import { hash } from "@node-rs/argon2";
import { and, eq, gt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { diagramSchema } from "../../lib/diagram";
import * as s from "../schema";
import { DRILLS } from "./drills";
import { ARRIVAL_FOCUS, CHALLENGE_FOCUS, EQUIPMENT, FINISH_FOCUS, U6_PLANS, U7_RULES_MD, WATER_FOCUS } from "./plans";

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client, { schema: s });

const AGE_GROUPS = [
  { code: "U6", name: "Under 6s", colour: "#0d9488", sortOrder: 6, rulesMd: "U6s train towards the U7 tag format. Keep it fun, high activity, very little queuing.\n\n" + U7_RULES_MD },
  { code: "U7", name: "Under 7s", colour: "#7c3aed", sortOrder: 7, rulesMd: U7_RULES_MD },
  { code: "U8", name: "Under 8s", colour: "#2563eb", sortOrder: 8, rulesMd: "" },
  { code: "U9", name: "Under 9s", colour: "#d97706", sortOrder: 9, rulesMd: "" },
  { code: "U10", name: "Under 10s", colour: "#dc2626", sortOrder: 10, rulesMd: "" },
  { code: "U11", name: "Under 11s", colour: "#059669", sortOrder: 11, rulesMd: "" },
  { code: "U12", name: "Under 12s", colour: "#4f46e5", sortOrder: 12, rulesMd: "" },
];

async function main() {
  // Admin
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase().trim();
  const pw = process.env.SEED_ADMIN_PASSWORD;
  if (email && pw) {
    const existing = await db.select().from(s.users).where(eq(s.users.email, email));
    if (!existing.length) {
      await db.insert(s.users).values({ email, name: process.env.SEED_ADMIN_NAME || "Club Admin", role: "admin", passwordHash: await hash(pw) });
      console.log(`Created admin ${email}`);
    }
  }

  // Age groups
  await db.insert(s.ageGroups).values(AGE_GROUPS).onConflictDoNothing();
  const groups = await db.select().from(s.ageGroups);
  const u6 = groups.find((g) => g.code === "U6")!;

  // Drills
  for (const d of DRILLS) {
    const diagram = diagramSchema.parse(d.diagram);
    await db
      .insert(s.drills)
      .values({ ...d, regressions: d.regressions ?? [], safetyNotes: d.safetyNotes ?? "", diagram })
      .onConflictDoNothing({ target: s.drills.slug });
  }
  const drills = await db.select({ id: s.drills.id, slug: s.drills.slug, cues: s.drills.coachingCues }).from(s.drills);
  const bySlug = new Map(drills.map((d) => [d.slug, d]));

  // Season
  await db
    .insert(s.seasons)
    .values({ name: "2026-27", startDate: "2026-09-06", endDate: "2027-05-30", current: true })
    .onConflictDoNothing();
  const [season] = await db.select().from(s.seasons).where(eq(s.seasons.name, "2026-27"));

  // Upgrade (idempotent): split the original seeded 6' "Water + micro-challenge" block into
  // a 2' water break and a separate challenge. Only touches blocks still carrying the seeded title.
  const legacy = await db
    .select()
    .from(s.sessionBlocks)
    .where(and(eq(s.sessionBlocks.blockType, "water"), eq(s.sessionBlocks.customTitle, "Water + micro-challenge")));
  for (const b of legacy) {
    await db.transaction(async (tx) => {
      await tx
        .update(s.sessionBlocks)
        .set({ order: sql`${s.sessionBlocks.order} + 1` })
        .where(and(eq(s.sessionBlocks.planId, b.planId), gt(s.sessionBlocks.order, b.order)));
      await tx.update(s.sessionBlocks).set({ durationMin: 2, customTitle: "Water break", coachFocus: WATER_FOCUS }).where(eq(s.sessionBlocks.id, b.id));
      await tx.insert(s.sessionBlocks).values({
        planId: b.planId,
        order: b.order + 1,
        durationMin: Math.max(1, b.durationMin - 2),
        blockType: "challenge",
        customTitle: "Micro-challenge",
        coachFocus: CHALLENGE_FOCUS,
      });
    });
  }
  if (legacy.length) console.log(`Split ${legacy.length} water + challenge blocks`);

  // U6 plans + weeks
  for (const p of U6_PLANS) {
    let [plan] = await db
      .select()
      .from(s.sessionPlans)
      .where(and(eq(s.sessionPlans.ageGroupId, u6.id), eq(s.sessionPlans.sequence, p.n)));
    if (!plan) {
      [plan] = await db
        .insert(s.sessionPlans)
        .values({
          title: `Session ${p.n}: ${p.theme}`,
          ageGroupId: u6.id,
          theme: p.pathway,
          outcome: p.outcome,
          durationMin: 45,
          startTime: "09:30",
          equipment: EQUIPMENT,
          checkpoint: p.checkpoint ?? "",
          sequence: p.n,
        })
        .returning();
      const cues = (slug: string) => bySlug.get(slug)?.cues.join("; ") ?? "";
      const blocks = [
        { durationMin: 7, blockType: "arrival" as const, drillId: bySlug.get("bulldog")?.id, customTitle: p.arrival, coachFocus: ARRIVAL_FOCUS },
        { durationMin: 10, blockType: "skill" as const, drillId: bySlug.get(p.skill1)?.id, customTitle: "", coachFocus: cues(p.skill1) },
        { durationMin: 10, blockType: "skill" as const, drillId: bySlug.get(p.skill2)?.id, customTitle: "", coachFocus: cues(p.skill2) },
        { durationMin: 2, blockType: "water" as const, drillId: null, customTitle: "Water break", coachFocus: WATER_FOCUS },
        { durationMin: 4, blockType: "challenge" as const, drillId: null, customTitle: "Micro-challenge", coachFocus: CHALLENGE_FOCUS },
        { durationMin: 12, blockType: "game" as const, drillId: bySlug.get(p.finish)?.id, customTitle: "", coachFocus: FINISH_FOCUS },
      ];
      await db.insert(s.sessionBlocks).values(blocks.map((b, i) => ({ ...b, drillId: b.drillId ?? null, planId: plan.id, order: i })));
    }
    await db
      .insert(s.seasonWeeks)
      .values({ seasonId: season.id, ageGroupId: u6.id, date: p.date, startTime: "09:30", endTime: "10:15", status: "training", sessionPlanId: plan.id })
      .onConflictDoNothing();
  }

  console.log(`Seed complete: ${DRILLS.length} drills, ${U6_PLANS.length} U6 sessions.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => client.end());
