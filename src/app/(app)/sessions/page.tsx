import { asc } from "drizzle-orm";
import { Plus } from "lucide-react";
import Link from "next/link";
import { TimelineBar } from "@/components/plan/timeline-bar";
import { Badge, Button, Card, Empty, PageHeader, Select } from "@/components/ui";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";
import { createPlan } from "./actions";

export const metadata = { title: "Session plans" };

export default async function SessionsPage({ searchParams }: { searchParams: Promise<{ age?: string }> }) {
  await requireStaff();
  const { age } = await searchParams;
  const [groups, plans, weeks] = await Promise.all([
    db.select().from(schema.ageGroups).orderBy(asc(schema.ageGroups.sortOrder)),
    db.query.sessionPlans.findMany({
      with: { blocks: { with: { drill: { columns: { title: true } } }, orderBy: (b, { asc }) => asc(b.order) } },
      orderBy: (p, { asc }) => [asc(p.sequence), asc(p.title)],
    }),
    db.select({ planId: schema.seasonWeeks.sessionPlanId, date: schema.seasonWeeks.date }).from(schema.seasonWeeks),
  ]);
  const datesByPlan = new Map<string, string[]>();
  for (const w of weeks) if (w.planId) datesByPlan.set(w.planId, [...(datesByPlan.get(w.planId) ?? []), w.date]);

  const shownGroups = groups.filter((g) => (!age || g.code === age) && plans.some((p) => p.ageGroupId === g.id));
  const unassigned = plans.filter((p) => !p.ageGroupId);

  return (
    <>
      <PageHeader
        eyebrow="Plans"
        title="Session plans"
        subtitle="45-minute sessions built from the drill library. Assign them to weeks on the Season page."
        actions={
          <form action={createPlan} className="flex gap-2">
            <Select name="ageGroupId" defaultValue={groups.find((g) => g.code === age)?.id ?? groups[0]?.id} className="w-28">
              {groups.map((g) => <option key={g.id} value={g.id}>{g.code}</option>)}
            </Select>
            <Button><Plus className="size-4" /> New plan</Button>
          </form>
        }
      />
      <div className="mb-6 flex flex-wrap gap-2">
        <Link href="/sessions" className={`rounded-full border px-3 py-1 text-sm font-medium ${!age ? "border-brand bg-brand text-brand-fg" : "border-border bg-surface text-muted"}`}>All</Link>
        {groups.filter((g) => plans.some((p) => p.ageGroupId === g.id)).map((g) => (
          <Link key={g.id} href={`/sessions?age=${g.code}`} className={`rounded-full border px-3 py-1 text-sm font-medium ${age === g.code ? "border-brand bg-brand text-brand-fg" : "border-border bg-surface text-muted"}`}>{g.code}</Link>
        ))}
      </div>

      {plans.length === 0 && <Empty title="No plans yet">Create your first session plan with the button above.</Empty>}

      {[...shownGroups.map((g) => ({ key: g.id, label: g.name, colour: g.colour, items: plans.filter((p) => p.ageGroupId === g.id) })), ...(unassigned.length && !age ? [{ key: "none", label: "No age group", colour: "#64748b", items: unassigned }] : [])].map((sec) => (
        <section key={sec.key} className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <span className="size-3 rounded-full" style={{ background: sec.colour }} /> {sec.label}
            <span className="text-sm font-normal text-muted">({sec.items.length})</span>
          </h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sec.items.map((p) => {
              const dates = datesByPlan.get(p.id) ?? [];
              return (
                <Link key={p.id} href={`/sessions/${p.id}`} className="group">
                  <Card className="h-full p-4 transition group-hover:-translate-y-0.5 group-hover:shadow-lg">
                    <div className="mb-1 flex items-center gap-2 text-xs text-muted">
                      {p.sequence && <span className="font-semibold text-brand">#{p.sequence}</span>}
                      {p.theme && <Badge>{p.theme}</Badge>}
                      {dates.length > 0 && <span className="ml-auto">{dates.length === 1 ? new Date(dates[0] + "T12:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : `${dates.length} weeks`}</span>}
                    </div>
                    <h3 className="font-semibold group-hover:text-brand">{p.title.replace(/^Session \d+:\s*/, "")}</h3>
                    <p className="mt-0.5 line-clamp-1 text-sm text-muted">{p.outcome}</p>
                    <TimelineBar
                      compact
                      className="mt-3"
                      blocks={p.blocks.map((b) => ({ durationMin: b.durationMin, blockType: b.blockType, title: b.customTitle || b.drill?.title || "" }))}
                    />
                    <p className="mt-2 line-clamp-1 text-xs text-muted">{p.blocks.map((b) => b.customTitle || b.drill?.title).filter(Boolean).join(" → ")}</p>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
