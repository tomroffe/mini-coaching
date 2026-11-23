import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";
import { PlanBuilder } from "./builder";

export const metadata = { title: "Edit plan" };

export default async function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const plan = await db.query.sessionPlans.findFirst({
    where: eq(schema.sessionPlans.id, id),
    with: { blocks: { orderBy: (b, { asc }) => asc(b.order) } },
  });
  if (!plan) notFound();
  const [drills, groups] = await Promise.all([
    db
      .select({ id: schema.drills.id, title: schema.drills.title, category: schema.drills.category, durationMin: schema.drills.durationMin, coachingCues: schema.drills.coachingCues, ageGroups: schema.drills.ageGroups, diagram: schema.drills.diagram })
      .from(schema.drills)
      .orderBy(asc(schema.drills.title)),
    db.select({ id: schema.ageGroups.id, code: schema.ageGroups.code }).from(schema.ageGroups).orderBy(asc(schema.ageGroups.sortOrder)),
  ]);
  return (
    <>
      <PageHeader eyebrow="Plan builder" title={plan.title} subtitle="Drag blocks to reorder, adjust minutes, and link drills from the library." />
      <PlanBuilder
        plan={{ id: plan.id, title: plan.title, ageGroupId: plan.ageGroupId, theme: plan.theme, outcome: plan.outcome, startTime: plan.startTime, equipment: plan.equipment, checkpoint: plan.checkpoint, notes: plan.notes }}
        blocks={plan.blocks.map((b) => ({ durationMin: b.durationMin, blockType: b.blockType, drillId: b.drillId, customTitle: b.customTitle, coachFocus: b.coachFocus }))}
        drills={drills}
        ageGroups={groups}
      />
    </>
  );
}
