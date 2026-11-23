import { asc, inArray, sql } from "drizzle-orm";
import { Award, ShieldCheck, UserPlus } from "lucide-react";
import Link from "next/link";
import { Avatar, Card, Empty, PageHeader } from "@/components/ui";
import { db, schema } from "@/db";
import { requireAccess } from "@/lib/authz";
import { attendanceRates, photoUrl, visiblePlayers } from "@/lib/queries";
import { cn, todayISO } from "@/lib/utils";
import { AddPlayer } from "./add-player";
import { EnrolQr } from "./enrol-qr";

export const metadata = { title: "Players" };

export default async function PlayersPage({ searchParams }: { searchParams: Promise<{ age?: string }> }) {
  const ctx = await requireAccess(["admin", "coach"]);
  const { age } = await searchParams;
  const allGroups = await db.select().from(schema.ageGroups).orderBy(asc(schema.ageGroups.sortOrder));
  const groups = ctx.role === "admin" ? allGroups : allGroups.filter((g) => ctx.ageGroupIds.includes(g.id));
  const group = groups.find((g) => g.code === age);
  const players = await visiblePlayers(ctx, group?.id);
  const ids = players.map((p) => p.id);
  const [rates, awardCounts] = await Promise.all([
    attendanceRates(ids, todayISO()),
    ids.length
      ? db.select({ playerId: schema.awards.playerId, n: sql<number>`count(*)::int` }).from(schema.awards).where(inArray(schema.awards.playerId, ids)).groupBy(schema.awards.playerId)
      : Promise.resolve([]),
  ]);
  const awardsBy = new Map(awardCounts.map((a) => [a.playerId, a.n]));
  const gById = new Map(allGroups.map((g) => [g.id, g]));

  return (
    <>
      <PageHeader
        eyebrow="Squad"
        title="Players"
        subtitle={ctx.role === "coach" ? "Players in the age groups you coach." : `${players.length} players`}
        actions={
          groups.length > 0 && (
            <>
              <EnrolQr groups={groups.map((g) => ({ id: g.id, code: g.code, colour: g.colour }))} defaultGroupId={group?.id ?? groups[0].id} />
              <AddPlayer groups={groups.map((g) => ({ id: g.id, code: g.code }))} defaultGroupId={group?.id ?? groups[0].id} />
            </>
          )
        }
      />

      {groups.length === 0 ? (
        <Empty title="You're not assigned to an age group yet">Ask a club admin to add you as a coach for your age group (Admin → Coaches).</Empty>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-2">
            <Link href="/players" className={cn("rounded-full border px-3 py-1 text-sm font-medium", !group ? "border-brand bg-brand text-brand-fg" : "border-border bg-surface text-muted")}>All</Link>
            {groups.map((g) => (
              <Link key={g.id} href={`/players?age=${g.code}`} className={cn("rounded-full border px-3 py-1 text-sm font-medium", group?.id === g.id ? "border-transparent text-white" : "border-border bg-surface text-muted")} style={group?.id === g.id ? { background: g.colour } : undefined}>
                {g.code}
              </Link>
            ))}
          </div>
          {players.length === 0 ? (
            <Empty icon={<UserPlus className="size-8" />} title="No players yet">Add players one at a time or paste a list with “Add player → Import”.</Empty>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {players.map((p) => {
                const g = p.ageGroupId ? gById.get(p.ageGroupId) : undefined;
                const r = rates.get(p.id);
                const pct = r && r.sessions ? Math.round((r.present / r.sessions) * 100) : null;
                return (
                  <Link key={p.id} href={`/players/${p.id}`} className="group">
                    <Card className="flex h-full flex-col items-center p-4 text-center transition group-hover:-translate-y-0.5 group-hover:shadow-lg">
                      <Avatar first={p.firstName} last={p.lastName} src={photoUrl(p)} size={72} colour={g?.colour} />
                      <div className="mt-2 font-semibold group-hover:text-brand">{p.firstName} {p.lastName}</div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                        {g && <span style={{ color: g.colour }} className="font-semibold">{g.code}</span>}
                        {pct !== null && <span>{pct}% attendance</span>}
                      </div>
                      <div className="mt-2 flex gap-2 text-xs text-muted">
                        {(awardsBy.get(p.id) ?? 0) > 0 && <span className="inline-flex items-center gap-0.5 text-amber-600"><Award className="size-3.5" />{awardsBy.get(p.id)}</span>}
                        {p.photoConsent && <span className="inline-flex items-center gap-0.5" title="Photo consent recorded"><ShieldCheck className="size-3.5" /> consent</span>}
                        {p.medicalNotes && <span className="font-semibold text-red-600" title="Has medical notes">⚕︎ medical</span>}
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </>
  );
}
