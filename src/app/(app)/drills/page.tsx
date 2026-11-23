import { asc } from "drizzle-orm";
import { Clock, Plus, Search, Users } from "lucide-react";
import Link from "next/link";
import { DrillDiagram } from "@/components/diagram/drill-diagram";
import { Badge, Card, Empty, Input, LinkButton, PageHeader } from "@/components/ui";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const metadata = { title: "Drill library" };

export default async function DrillsPage({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string; age?: string }> }) {
  await requireStaff();
  const { q = "", cat = "", age = "" } = await searchParams;
  const all = await db.select().from(schema.drills).orderBy(asc(schema.drills.title));
  const categories = [...new Set(all.map((d) => d.category))].sort();
  const ages = [...new Set(all.flatMap((d) => d.ageGroups))].sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
  const needle = q.toLowerCase();
  const drills = all.filter(
    (d) =>
      (!cat || d.category === cat) &&
      (!age || d.ageGroups.includes(age)) &&
      (!needle || [d.title, d.summary, d.tags.join(" "), d.coachingCues.join(" ")].join(" ").toLowerCase().includes(needle)),
  );

  const href = (p: Record<string, string>) => {
    const sp = new URLSearchParams({ q, cat, age, ...p });
    for (const [k, v] of [...sp]) if (!v) sp.delete(k);
    return `/drills${sp.size ? `?${sp}` : ""}`;
  };

  return (
    <>
      <PageHeader
        eyebrow="Library"
        title="Drills & games"
        subtitle={`${all.length} activities with animated diagrams, coaching cues and videos.`}
        actions={
          <LinkButton href="/drills/new">
            <Plus className="size-4" /> New drill
          </LinkButton>
        }
      />

      <form className="mb-4 flex gap-2" action="/drills">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <Input name="q" defaultValue={q} placeholder="Search drills, cues or tags…" className="pl-9" />
        </div>
        {cat && <input type="hidden" name="cat" value={cat} />}
        {age && <input type="hidden" name="age" value={age} />}
      </form>
      <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto scroll-px-4 px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&>*]:shrink-0">
        <Chip href={href({ cat: "" })} active={!cat}>All</Chip>
        {categories.map((c) => (
          <Chip key={c} href={href({ cat: c === cat ? "" : c })} active={c === cat}>
            {c}
          </Chip>
        ))}
        <span className="mx-1 w-px bg-border" />
        {ages.map((a) => (
          <Chip key={a} href={href({ age: a === age ? "" : a })} active={a === age}>
            {a}
          </Chip>
        ))}
      </div>

      {drills.length === 0 ? (
        <Empty title="No drills match">Try a different search or clear the filters.</Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {drills.map((d) => (
            <Link key={d.id} href={`/drills/${d.slug}`} className="group">
              <Card className="h-full overflow-hidden transition group-hover:-translate-y-0.5 group-hover:shadow-lg">
                {d.diagram && <DrillDiagram diagram={d.diagram} chromeless hoverPlay className="border-b border-border" />}
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold group-hover:text-brand">{d.title}</h3>
                    <Badge>{d.category}</Badge>
                  </div>
                  <p className="line-clamp-2 text-sm text-muted">{d.summary}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                    <span className="inline-flex items-center gap-1"><Clock className="size-3.5" />{d.durationMin} min</span>
                    <span className="inline-flex items-center gap-1"><Users className="size-3.5" />{d.minPlayers}+</span>
                    {d.area && <span>{d.area}</span>}
                    <span className="ml-auto">{d.ageGroups.join(" · ")}</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function Chip({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-sm font-medium capitalize transition",
        active ? "border-brand bg-brand text-brand-fg" : "border-border bg-surface text-muted hover:text-text",
      )}
    >
      {children}
    </Link>
  );
}
