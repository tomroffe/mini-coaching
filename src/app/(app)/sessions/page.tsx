import { asc } from "drizzle-orm";
import { CalendarDays, LayoutList, Plus } from "lucide-react";
import { MonthCalendar } from "@/components/calendar/month-calendar";
import { calendarEvents } from "@/lib/queries";
import { todayISO } from "@/lib/utils";
import Link from "next/link";
import { TimelineBar } from "@/components/plan/timeline-bar";
import { Badge, Button, Card, Empty, PageHeader, Select } from "@/components/ui";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";
import { createPlan } from "./actions";

export const metadata = { title: "Session plans" };

export default async function SessionsPage({ searchParams }: { searchParams: Promise<{ age?: string; view?: string }> }) {
  await requireStaff();
  const { age, view: viewParam } = await searchParams;
  const view = viewParam === "calendar" ? "calendar" : "plans";
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
  const calGroups = groups.filter((g) => !age || g.code === age).map((g) => g.id);
  const calEvents = view === "calendar" ? await calendarEvents(calGroups) : [];
  const href = (p: { age?: string; view?: string }) => {
    const q = new URLSearchParams();
    const a = "age" in p ? p.age : age;
    const v = "view" in p ? p.view : view;
    if (a) q.set("age", a);
    if (v === "calendar") q.set("view", "calendar");
    return `/sessions${q.size ? `?${q}` : ""}`;
  };

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
      <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto scroll-px-4 px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&>*]:shrink-0">
        <Link href={href({ age: undefined })} className={`rounded-full border px-3 py-1 text-sm font-medium ${!age ? "border-brand bg-brand text-brand-fg" : "border-border bg-surface text-muted"}`}>All</Link>
        {groups.filter((g) => plans.some((p) => p.ageGroupId === g.id)).map((g) => (
          <Link key={g.id} href={href({ age: g.code })} className={`rounded-full border px-3 py-1 text-sm font-medium ${age === g.code ? "border-brand bg-brand text-brand-fg" : "border-border bg-surface text-muted"}`}>{g.code}</Link>
        ))}
        <span className="flex-1" />
        <div className="inline-flex rounded-full border border-border bg-surface p-0.5 text-sm" role="tablist" aria-label="View">
          {(["plans", "calendar"] as const).map((v) => (
            <Link
              key={v}
              href={href({ view: v })}
              role="tab"
              aria-selected={view === v}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium ${view === v ? "bg-brand text-brand-fg" : "text-muted hover:text-text"}`}
            >
              {v === "plans" ? <LayoutList className="size-4" /> : <CalendarDays className="size-4" />} {v === "plans" ? "Plans" : "Calendar"}
            </Link>
          ))}
        </div>
      </div>

      {view === "calendar" && (
        <Card className="p-4 sm:p-5">
          {calEvents.length ? (
            <MonthCalendar events={calEvents} today={todayISO()} showTitles />
          ) : (
            <p className="text-sm text-muted">No sessions scheduled{age ? ` for ${age}` : ""} this season yet. Add weeks on the Season page.</p>
          )}
        </Card>
      )}

      {view === "plans" && plans.length === 0 && <Empty title="No plans yet">Create your first session plan with the button above.</Empty>}

      {view === "plans" && [...shownGroups.map((g) => ({ key: g.id, label: g.name, colour: g.colour, items: plans.filter((p) => p.ageGroupId === g.id) })), ...(unassigned.length && !age ? [{ key: "none", label: "No age group", colour: "#64748b", items: unassigned }] : [])].map((sec) => (
        <section key={sec.key} className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <span className="size-3 rounded-full" style={{ background: sec.colour }} /> {sec.label}
            <span className="text-sm font-normal text-muted">({sec.items.length})</span>
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
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
