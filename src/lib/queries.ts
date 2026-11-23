import "server-only";
import { and, eq, inArray, lte, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { AccessContext } from "./access";

/** Players visible to the current user. */
export async function visiblePlayers(ctx: AccessContext, ageGroupId?: string) {
  const conds = [eq(schema.players.active, true)];
  if (ageGroupId) conds.push(eq(schema.players.ageGroupId, ageGroupId));
  if (ctx.role === "coach") {
    if (!ctx.ageGroupIds.length) return [];
    conds.push(inArray(schema.players.ageGroupId, ctx.ageGroupIds));
  } else if (ctx.role === "parent") {
    if (!ctx.childIds.length) return [];
    conds.push(inArray(schema.players.id, ctx.childIds));
  }
  return db
    .select()
    .from(schema.players)
    .where(and(...conds))
    .orderBy(schema.players.firstName, schema.players.lastName);
}

/** Attendance % per player across past training weeks of their age group. */
export async function attendanceRates(playerIds: string[], uptoISO: string) {
  if (!playerIds.length) return new Map<string, { present: number; sessions: number }>();
  const rows = await db
    .select({
      playerId: schema.players.id,
      sessions: sql<number>`count(distinct ${schema.seasonWeeks.id})::int`,
      present: sql<number>`count(distinct ${schema.attendance.seasonWeekId}) filter (where ${schema.attendance.status} <> 'absent')::int`,
    })
    .from(schema.players)
    .innerJoin(schema.seasonWeeks, and(eq(schema.seasonWeeks.ageGroupId, schema.players.ageGroupId), eq(schema.seasonWeeks.status, "training"), lte(schema.seasonWeeks.date, uptoISO),
      // only weeks where a register was actually taken
      sql`exists (select 1 from attendance a2 where a2.season_week_id = ${schema.seasonWeeks.id})`))
    .leftJoin(schema.attendance, and(eq(schema.attendance.seasonWeekId, schema.seasonWeeks.id), eq(schema.attendance.playerId, schema.players.id)))
    .where(inArray(schema.players.id, playerIds))
    .groupBy(schema.players.id);
  return new Map(rows.map((r) => [r.playerId, { present: r.present, sessions: r.sessions }]));
}

export const photoUrl = (p: { photoKey: string | null; photoConsent: boolean }) => (p.photoKey && p.photoConsent ? `/api/media/${p.photoKey}` : null);
