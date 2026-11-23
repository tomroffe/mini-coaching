import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { DrillDiagram } from "./drill-diagram";

/** Looping animated drill used as decoration on the sign-in page. */
export async function HeroPitch() {
  const [d] = await db.select({ diagram: schema.drills.diagram }).from(schema.drills).where(eq(schema.drills.slug, "u7-tag"));
  if (!d?.diagram) return null;
  return (
    <div className="flex h-full items-center justify-center p-10">
      <DrillDiagram diagram={d.diagram} chromeless autoPlay className="w-full max-w-2xl drop-shadow-2xl" />
    </div>
  );
}
