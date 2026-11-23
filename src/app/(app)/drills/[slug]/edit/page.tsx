import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";
import { DrillForm } from "../../drill-form";

export const metadata = { title: "Edit drill" };

export default async function EditDrillPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireStaff();
  const { slug } = await params;
  const [drill] = await db.select().from(schema.drills).where(eq(schema.drills.slug, slug));
  if (!drill) notFound();
  const groups = await db.select({ code: schema.ageGroups.code }).from(schema.ageGroups).orderBy(asc(schema.ageGroups.sortOrder));
  return (
    <>
      <PageHeader eyebrow="Edit drill" title={drill.title} />
      <DrillForm drill={drill} ageGroups={groups.map((g) => g.code)} canDelete={user.role === "admin"} />
    </>
  );
}
