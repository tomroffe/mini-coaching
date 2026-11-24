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

/** Current-season weeks as month-calendar events (optionally with one user's availability). */
export async function calendarEvents(groupIds: string[], userId?: string) {
  if (!groupIds.length) return [];
  const [season] = await db.select({ id: schema.seasons.id }).from(schema.seasons).where(eq(schema.seasons.current, true));
  if (!season) return [];
  const rows = await db
    .select({
      weekId: schema.seasonWeeks.id,
      date: schema.seasonWeeks.date,
      start: schema.seasonWeeks.startTime,
      status: schema.seasonWeeks.status,
      code: schema.ageGroups.code,
      colour: schema.ageGroups.colour,
      planId: schema.sessionPlans.id,
      planTitle: schema.sessionPlans.title,
    })
    .from(schema.seasonWeeks)
    .innerJoin(schema.ageGroups, eq(schema.ageGroups.id, schema.seasonWeeks.ageGroupId))
    .leftJoin(schema.sessionPlans, eq(schema.sessionPlans.id, schema.seasonWeeks.sessionPlanId))
    .where(and(eq(schema.seasonWeeks.seasonId, season.id), inArray(schema.seasonWeeks.ageGroupId, groupIds)))
    .orderBy(schema.seasonWeeks.date, schema.ageGroups.sortOrder);
  const mine = new Map<string, "available" | "maybe" | "unavailable">();
  if (userId && rows.length) {
    const av = await db
      .select()
      .from(schema.coachAvailability)
      .where(and(eq(schema.coachAvailability.userId, userId), inArray(schema.coachAvailability.seasonWeekId, rows.map((r) => r.weekId))));
    for (const a of av) mine.set(a.seasonWeekId, a.status);
  }
  return rows.map((r) => ({ ...r, mine: userId ? mine.get(r.weekId) ?? null : undefined }));
}
