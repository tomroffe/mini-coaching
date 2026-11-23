import { asc } from "drizzle-orm";
import { PageHeader } from "@/components/ui";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";
import { DrillForm } from "../drill-form";

export const metadata = { title: "New drill" };

export default async function NewDrillPage() {
  await requireStaff();
  const groups = await db.select({ code: schema.ageGroups.code }).from(schema.ageGroups).orderBy(asc(schema.ageGroups.sortOrder));
  return (
    <>
      <PageHeader eyebrow="Library" title="New drill" />
      <DrillForm ageGroups={groups.map((g) => g.code)} />
    </>
  );
}
