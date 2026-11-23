import { asc, eq } from "drizzle-orm";
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, MapPin, Package, Pencil, TrendingDown, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DrillDiagram } from "@/components/diagram/drill-diagram";
import { Badge, Card, LinkButton } from "@/components/ui";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";
import { MediaManager } from "./media";

export default async function DrillPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireStaff();
  const { slug } = await params;
  const drill = await db.query.drills.findFirst({ where: eq(schema.drills.slug, slug), with: { media: true } });
  if (!drill) notFound();
  const usedIn = await db
    .selectDistinct({ id: schema.sessionPlans.id, title: schema.sessionPlans.title, sequence: schema.sessionPlans.sequence })
    .from(schema.sessionBlocks)
    .innerJoin(schema.sessionPlans, eq(schema.sessionBlocks.planId, schema.sessionPlans.id))
    .where(eq(schema.sessionBlocks.drillId, drill.id))
    .orderBy(asc(schema.sessionPlans.sequence));

  return (
    <>
      <div className="no-print mb-4 flex items-center justify-between gap-2">
        <Link href="/drills" className="inline-flex items-center gap-1 py-2 text-sm text-muted hover:text-text">
          <ArrowLeft className="size-4" /> Drill library
        </Link>
        <LinkButton href={`/drills/${drill.slug}/edit`} variant="secondary" size="sm" className="sm:hidden">
          <Pencil className="size-4" /> Edit
        </LinkButton>
      </div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            <Badge colour="#0f766e">{drill.category}</Badge>
            {drill.ageGroups.map((a) => <Badge key={a}>{a}</Badge>)}
          </div>
          <h1 className="text-3xl font-bold">{drill.title}</h1>
          <p className="mt-1 max-w-2xl text-muted">{drill.summary}</p>
        </div>
        <LinkButton href={`/drills/${drill.slug}/edit`} variant="secondary" className="no-print hidden sm:inline-flex">
          <Pencil className="size-4" /> Edit
        </LinkButton>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          {drill.diagram && <DrillDiagram diagram={drill.diagram} autoPlay />}
          <MediaManager drillId={drill.id} slug={drill.slug} media={drill.media} canEdit={user.role !== "parent"} />
        </div>

        <div className="space-y-4">
          <Card className="grid grid-cols-2 gap-3 p-4 text-sm">
            <Meta icon={<Clock className="size-4" />} label="Duration" value={`${drill.durationMin} min`} />
            <Meta icon={<Users className="size-4" />} label="Players" value={`${drill.minPlayers}+`} />
            <Meta icon={<MapPin className="size-4" />} label="Area" value={drill.area || "–"} />
            <Meta icon={<Package className="size-4" />} label="Equipment" value={drill.equipment.join(", ") || "–"} />
          </Card>

          <Section title="Set-up">{drill.setup}</Section>
          <Section title="How to run it">{drill.howToRun}</Section>

          {drill.coachingCues.length > 0 && (
            <Card className="p-4">
              <h3 className="mb-2 font-semibold">Coaching cues</h3>
              <ul className="space-y-1.5">
                {drill.coachingCues.map((c) => (
                  <li key={c} className="flex gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand" /> {c}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <ListCard title="Progressions" icon={<TrendingUp className="size-4 text-brand" />} items={drill.progressions} />
          <ListCard title="Regressions" icon={<TrendingDown className="size-4 text-sky-600" />} items={drill.regressions} />
          {drill.safetyNotes && (
            <Card className="flex gap-3 border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertTriangle className="size-5 shrink-0" /> {drill.safetyNotes}
            </Card>
          )}
          {drill.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {drill.tags.map((t) => (
                <Link key={t} href={`/drills?q=${encodeURIComponent(t)}`}>
                  <Badge>#{t}</Badge>
                </Link>
              ))}
            </div>
          )}
          {usedIn.length > 0 && (
            <Card className="p-4">
              <h3 className="mb-2 font-semibold">Used in {usedIn.length} session plan{usedIn.length === 1 ? "" : "s"}</h3>
              <ul className="space-y-1 text-sm">
                {usedIn.map((p) => (
                  <li key={p.id}>
                    <Link className="text-brand hover:underline" href={`/sessions/${p.id}`}>{p.title}</Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function Meta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="mt-0.5 text-muted">{icon}</span>
      <div>
        <div className="text-xs text-muted">{label}</div>
        <div className="font-medium">{value}</div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  if (!children) return null;
  return (
    <Card className="p-4">
      <h3 className="mb-1 font-semibold">{title}</h3>
      <p className="text-sm whitespace-pre-line">{children}</p>
    </Card>
  );
}

function ListCard({ title, icon, items }: { title: string; icon: React.ReactNode; items: string[] }) {
  if (!items.length) return null;
  return (
    <Card className="p-4">
      <h3 className="mb-2 font-semibold">{title}</h3>
      <ul className="space-y-1.5">
        {items.map((c) => (
          <li key={c} className="flex gap-2 text-sm">
            <span className="mt-0.5 shrink-0">{icon}</span> {c}
          </li>
        ))}
      </ul>
    </Card>
  );
}
