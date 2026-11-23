import { asc, eq } from "drizzle-orm";
import { ArrowLeft, CalendarDays, Droplets, Flag, Package, Pencil, Target, Zap } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DrillDiagram } from "@/components/diagram/drill-diagram";
import { TimelineBar } from "@/components/plan/timeline-bar";
import { Badge, Button, Card, LinkButton, Select } from "@/components/ui";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";
import { BLOCK_TYPES } from "@/lib/curriculum";
import { addMinutes, fmtDate } from "@/lib/utils";
import { duplicatePlan } from "../actions";
import { PrintButton } from "./print-button";

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const plan = await db.query.sessionPlans.findFirst({
    where: eq(schema.sessionPlans.id, id),
    with: { ageGroup: true, blocks: { with: { drill: true }, orderBy: (b, { asc }) => asc(b.order) } },
  });
  if (!plan) notFound();
  const [groups, weeks] = await Promise.all([
    db.select().from(schema.ageGroups).orderBy(asc(schema.ageGroups.sortOrder)),
    db.select().from(schema.seasonWeeks).where(eq(schema.seasonWeeks.sessionPlanId, id)).orderBy(asc(schema.seasonWeeks.date)),
  ]);

  let t = 0;
  const timed = plan.blocks.map((b) => {
    const start = addMinutes(plan.startTime, t);
    t += b.durationMin;
    return { ...b, start, end: addMinutes(plan.startTime, t), title: b.customTitle || b.drill?.title || "Activity" };
  });

  return (
    <>
      <Link href="/sessions" className="no-print mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Session plans
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {plan.ageGroup && <Badge colour={plan.ageGroup.colour}>{plan.ageGroup.code}</Badge>}
            {plan.theme && <Badge>{plan.theme}</Badge>}
            <Badge>{plan.durationMin} min</Badge>
          </div>
          <h1 className="text-2xl font-bold sm:text-3xl">{plan.title}</h1>
          {weeks.length > 0 && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
              <CalendarDays className="size-4" /> {weeks.map((w) => fmtDate(w.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })).join(", ")}
            </p>
          )}
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <PrintButton />
          <form action={duplicatePlan.bind(null, plan.id)} className="flex gap-1">
            <Select name="ageGroupId" defaultValue={plan.ageGroupId ?? ""} className="h-10 w-24" aria-label="Copy to age group">
              {groups.map((g) => <option key={g.id} value={g.id}>{g.code}</option>)}
            </Select>
            <Button variant="secondary">Duplicate</Button>
          </form>
          <LinkButton href={`/sessions/${plan.id}/edit`}><Pencil className="size-4" /> Edit plan</LinkButton>
        </div>
      </div>

      {plan.outcome && (
        <Card className="mb-6 flex gap-3 border-brand/30 bg-brand-soft p-4">
          <Target className="mt-0.5 size-5 shrink-0 text-brand" />
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-brand">Session outcome</div>
            <p className="font-medium">{plan.outcome}</p>
          </div>
        </Card>
      )}

      <TimelineBar className="mb-8" startTime={plan.startTime} blocks={timed.map((b) => ({ durationMin: b.durationMin, blockType: b.blockType, title: b.title }))} />

      <ol className="relative space-y-6 before:absolute before:top-2 before:bottom-2 before:left-[1.05rem] before:w-0.5 before:bg-border">
        {timed.map((b, i) => {
          const type = BLOCK_TYPES.find((x) => x.value === b.blockType);
          return (
            <li key={b.id} className="relative pl-12">
              <span
                className="absolute top-1 left-0 flex size-9 items-center justify-center rounded-full text-sm font-bold text-white shadow ring-4 ring-bg"
                style={{ background: type?.colour }}
              >
                {b.blockType === "water" ? <Droplets className="size-4" /> : b.blockType === "challenge" ? <Zap className="size-4" /> : i + 1}
              </span>
              <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-mono text-sm text-muted tabular-nums">{b.start}–{b.end}</span>
                <h2 className="text-lg font-semibold">{b.title}</h2>
                <span className="text-xs font-medium" style={{ color: type?.colour }}>{type?.label}</span>
                {b.drill && b.customTitle && b.customTitle !== b.drill.title && (
                  <Link href={`/drills/${b.drill.slug}`} className="text-sm text-brand hover:underline">based on {b.drill.title}</Link>
                )}
                {b.drill && !b.customTitle && (
                  <Link href={`/drills/${b.drill.slug}`} className="no-print text-sm text-brand hover:underline">Drill card →</Link>
                )}
              </div>
              {b.coachFocus && <p className="mb-3 max-w-3xl text-sm"><span className="font-semibold">Coach focus: </span>{b.coachFocus}</p>}
              {b.drill?.diagram && b.blockType !== "water" && (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                  <DrillDiagram diagram={b.drill.diagram} />
                  <div className="space-y-2 text-sm">
                    {b.drill.setup && <p><span className="font-semibold">Set-up: </span>{b.drill.setup}</p>}
                    {b.drill.howToRun && <p className="text-muted">{b.drill.howToRun}</p>}
                    {b.drill.progressions.length > 0 && (
                      <p><span className="font-semibold">Progress: </span>{b.drill.progressions.join("; ")}</p>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {plan.equipment && (
          <Card className="flex gap-3 p-4">
            <Package className="mt-0.5 size-5 shrink-0 text-muted" />
            <div><div className="font-semibold">Equipment</div><p className="text-sm">{plan.equipment}</p></div>
          </Card>
        )}
        {plan.checkpoint && (
          <Card className="flex gap-3 border-accent/50 p-4">
            <Flag className="mt-0.5 size-5 shrink-0 text-amber-500" />
            <div><div className="font-semibold">Checkpoint</div><p className="text-sm">{plan.checkpoint}</p></div>
          </Card>
        )}
        {plan.notes && (
          <Card className="p-4 md:col-span-2"><div className="font-semibold">Notes</div><p className="text-sm whitespace-pre-line">{plan.notes}</p></Card>
        )}
      </div>
    </>
  );
}
