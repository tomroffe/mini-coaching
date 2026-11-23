import { and, asc, desc, eq, lte } from "drizzle-orm";
import { ArrowLeft, Award as AwardIcon, Download } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, Badge, Card, CardHeader, LinkButton } from "@/components/ui";
import { db, schema } from "@/db";
import { canManagePlayer, canViewPlayer, requireAccess } from "@/lib/authz";
import { photoUrl } from "@/lib/queries";
import { cn, fmtDate, todayISO } from "@/lib/utils";
import { AwardTypeTag } from "@/components/award-type-tag";
import { awardType } from "@/lib/awards";
import { GuardianForm, PhotoForm, PlayerDetailsForm } from "./forms";

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAccess(["admin", "coach"]);
  const { id } = await params;
  const [p] = await db.select().from(schema.players).where(eq(schema.players.id, id));
  if (!p || !canViewPlayer(ctx, p)) notFound();
  const canEdit = canManagePlayer(ctx, p);

  const [groups, guardians, weeks, awards] = await Promise.all([
    db.select().from(schema.ageGroups).orderBy(asc(schema.ageGroups.sortOrder)),
    db.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email }).from(schema.playerGuardians).innerJoin(schema.users, eq(schema.users.id, schema.playerGuardians.userId)).where(eq(schema.playerGuardians.playerId, id)),
    p.ageGroupId
      ? db
          .select({ id: schema.seasonWeeks.id, date: schema.seasonWeeks.date, status: schema.attendance.status })
          .from(schema.seasonWeeks)
          .leftJoin(schema.attendance, and(eq(schema.attendance.seasonWeekId, schema.seasonWeeks.id), eq(schema.attendance.playerId, id)))
          .where(and(eq(schema.seasonWeeks.ageGroupId, p.ageGroupId), eq(schema.seasonWeeks.status, "training"), lte(schema.seasonWeeks.date, todayISO())))
          .orderBy(desc(schema.seasonWeeks.date))
          .limit(30)
      : Promise.resolve([]),
    db.select().from(schema.awards).where(eq(schema.awards.playerId, id)).orderBy(desc(schema.awards.awardedOn)),
  ]);
  const group = groups.find((g) => g.id === p.ageGroupId);
  const present = weeks.filter((w) => w.status && w.status !== "absent").length;
  const recorded = weeks.filter((w) => w.status).length;

  return (
    <>
      <Link href="/players" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-text"><ArrowLeft className="size-4" /> Players</Link>
      <div className="mb-8 flex flex-wrap items-center gap-5">
        <Avatar first={p.firstName} last={p.lastName} src={photoUrl(p)} size={96} colour={group?.colour} />
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{p.firstName} {p.lastName}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            {group && <Badge colour={group.colour}>{group.code}</Badge>}
            {p.dob && <span>Born {fmtDate(p.dob, { day: "numeric", month: "long", year: "numeric" })}</span>}
            {recorded > 0 && <span>· {Math.round((present / recorded) * 100)}% attendance ({present}/{recorded})</span>}
            {!p.active && <Badge colour="#dc2626">Inactive</Badge>}
          </div>
        </div>
        {canEdit && <LinkButton href={`/awards?player=${p.id}`} variant="secondary"><AwardIcon className="size-4" /> Give award</LinkButton>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Awards & certificates" />
            <div className="px-5 pb-5">
              {awards.length === 0 ? (
                <p className="text-sm text-muted">No awards yet.</p>
              ) : (
                <ul className="space-y-2">
                  {awards.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
                      <span className="text-2xl">{awardType(a.type).emoji}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 font-medium">{a.title} <AwardTypeTag type={a.type} /></div>
                        <div className="truncate text-xs text-muted">{fmtDate(a.awardedOn, { day: "numeric", month: "short", year: "numeric" })}{a.reason && ` · ${a.reason}`}</div>
                      </div>
                      <a href={`/api/certificate/${a.id}`} className="rounded-lg p-2 text-muted hover:bg-surface hover:text-brand" title="Download certificate"><Download className="size-4" /></a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Recent attendance" />
            <div className="flex flex-wrap gap-1.5 px-5 pb-5">
              {weeks.length === 0 && <p className="text-sm text-muted">No sessions yet.</p>}
              {[...weeks].reverse().map((w) => (
                <Link
                  key={w.id}
                  href={`/register/${w.id}`}
                  title={`${fmtDate(w.date)}: ${w.status ?? "not recorded"}`}
                  className={cn(
                    "flex size-10 flex-col items-center justify-center rounded-lg text-[10px] leading-tight font-semibold",
                    w.status === "present" && "bg-emerald-500 text-white",
                    w.status === "late" && "bg-amber-400 text-white",
                    w.status === "absent" && "bg-red-500/15 text-red-600",
                    !w.status && "bg-surface-2 text-muted",
                  )}
                >
                  <span>{new Date(w.date + "T12:00").getDate()}</span>
                  <span className="font-normal">{new Date(w.date + "T12:00").toLocaleDateString("en-GB", { month: "short" })}</span>
                </Link>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {canEdit && <PhotoForm playerId={p.id} hasPhoto={!!p.photoKey} consent={p.photoConsent} />}
          <PlayerDetailsForm player={p} groups={groups.map((g) => ({ id: g.id, code: g.code }))} canEdit={canEdit} canDelete={ctx.role === "admin"} />
          <GuardianForm playerId={p.id} guardians={guardians} canEdit={canEdit} />
        </div>
      </div>
    </>
  );
}
