import { asc, desc, eq, inArray } from "drizzle-orm";
import { Download } from "lucide-react";
import Link from "next/link";
import { Avatar, Card, CardHeader, PageHeader } from "@/components/ui";
import { db, schema } from "@/db";
import { canManagePlayer, requireAccess } from "@/lib/authz";
import { photoUrl, visiblePlayers } from "@/lib/queries";
import { fmtDate } from "@/lib/utils";
import { AwardTypeTag } from "@/components/award-type-tag";
import { awardType } from "@/lib/awards";
import { AwardForm, DeleteAward } from "./form";
import { AwardInsights } from "./insights";

export const metadata = { title: "Awards" };


export default async function AwardsPage({ searchParams }: { searchParams: Promise<{ player?: string }> }) {
  const ctx = await requireAccess(["admin", "coach"]);
  const { player } = await searchParams;
  const [players, groups] = await Promise.all([visiblePlayers(ctx), db.select().from(schema.ageGroups).orderBy(asc(schema.ageGroups.sortOrder))]);
  const ids = players.map((p) => p.id);
  const recent = ids.length
    ? await db
        .select({ a: schema.awards, firstName: schema.players.firstName, lastName: schema.players.lastName, photoKey: schema.players.photoKey, photoConsent: schema.players.photoConsent, ageGroupId: schema.players.ageGroupId, by: schema.users.name })
        .from(schema.awards)
        .innerJoin(schema.players, eq(schema.players.id, schema.awards.playerId))
        .leftJoin(schema.users, eq(schema.users.id, schema.awards.awardedBy))
        .where(inArray(schema.awards.playerId, ids))
        .orderBy(desc(schema.awards.awardedOn), desc(schema.awards.createdAt))
        .limit(60)
    : [];
  const [allAwards, seasons] = await Promise.all([
    ids.length
      ? db.select({ playerId: schema.awards.playerId, type: schema.awards.type, awardedOn: schema.awards.awardedOn, title: schema.awards.title }).from(schema.awards).where(inArray(schema.awards.playerId, ids))
      : Promise.resolve([]),
    db.select().from(schema.seasons).where(eq(schema.seasons.current, true)),
  ]);
  const season = seasons[0];
  const gById = new Map(groups.map((g) => [g.id, g]));
  const manageable = players.filter((p) => canManagePlayer(ctx, p));

  return (
    <>
      <PageHeader eyebrow="Celebrate" title="Awards & certificates" subtitle="Player of the week, badges and end-of-season certificates. Every award has a printable certificate." />
      <AwardInsights
        players={players.map((p) => ({ id: p.id, name: `${p.firstName} ${p.lastName}`, groupId: p.ageGroupId }))}
        groups={groups.map((g) => ({ id: g.id, code: g.code, colour: g.colour }))}
        awards={allAwards}
        season={season ? { name: season.name, start: season.startDate, end: season.endDate } : null}
      />
      <div id="give" className="grid scroll-mt-20 gap-6 lg:grid-cols-[24rem_minmax(0,1fr)]">
        <AwardForm
          key={player ?? "none"}
          players={manageable.map((p) => ({ id: p.id, name: `${p.firstName} ${p.lastName}`, group: gById.get(p.ageGroupId ?? "")?.code ?? "" }))}
          preselect={player}
        />
        <Card>
          <CardHeader title="Recent awards" />
          <div className="px-5 pb-5">
            {recent.length === 0 && <p className="text-sm text-muted">No awards yet. Make someone&apos;s day!</p>}
            <ul className="divide-y divide-border">
              {recent.map(({ a, firstName, lastName, photoKey, photoConsent, ageGroupId, by }) => (
                <li key={a.id} className="flex items-center gap-3 py-3">
                  <div className="relative">
                    <Avatar first={firstName} last={lastName} src={photoUrl({ photoKey, photoConsent })} size={44} colour={gById.get(ageGroupId ?? "")?.colour} />
                    <span className="absolute -right-1 -bottom-1 text-base">{awardType(a.type).emoji}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-medium"><Link href={`/players/${a.playerId}`} className="hover:text-brand">{firstName} {lastName}</Link> · {a.title} <AwardTypeTag type={a.type} /></div>
                    <div className="truncate text-xs text-muted">{fmtDate(a.awardedOn, { day: "numeric", month: "short", year: "numeric" })}{by && ` · by ${by}`}{a.reason && ` · ${a.reason}`}</div>
                  </div>
                  <a href={`/api/certificate/${a.id}`} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-brand hover:bg-brand-soft" title="Download certificate PDF">
                    <Download className="size-4" /> <span className="hidden sm:inline">Certificate</span>
                  </a>
                  <DeleteAward id={a.id} />
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>
    </>
  );
}
