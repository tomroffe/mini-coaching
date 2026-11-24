import "server-only";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import type { AccessContext } from "./access";
import { buildIcs, type IcsEvent } from "./ics";

export type Availability = "available" | "maybe" | "unavailable";

export const ANSWER: Record<Availability, { emoji: string; label: string; short: string }> = {
  available: { emoji: "✅", label: "I can make it", short: "I'm in" },
  maybe: { emoji: "🤔", label: "Maybe", short: "Maybe" },
  unavailable: { emoji: "❌", label: "Can't make it", short: "Can't" },
};

const TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/;

/** Resolve a calendar token to an active staff user plus the age groups their feed covers. */
export async function calendarUser(token: string) {
  if (!TOKEN_RE.test(token)) return null;
  const [u] = await db.select().from(schema.users).where(eq(schema.users.calendarToken, token));
  if (!u || !u.active || u.role === "parent") return null;
  const assigned = await db.select({ id: schema.coachAssignments.ageGroupId }).from(schema.coachAssignments).where(eq(schema.coachAssignments.userId, u.id));
  let groupIds = assigned.map((a) => a.id);
  // admins who don't coach a specific group see every group
  if (u.role === "admin" && !groupIds.length) groupIds = (await db.select({ id: schema.ageGroups.id }).from(schema.ageGroups)).map((g) => g.id);
  const ctx: AccessContext = { role: u.role, ageGroupIds: groupIds, childIds: [] };
  return { user: u, groupIds, ctx };
}

/** Weeks (current season) for the given groups, with plan + this user's availability. */
export async function feedWeeks(userId: string, groupIds: string[]) {
  if (!groupIds.length) return [];
  const [season] = await db.select().from(schema.seasons).where(eq(schema.seasons.current, true));
  if (!season) return [];
  const weeks = await db
    .select({
      id: schema.seasonWeeks.id,
      date: schema.seasonWeeks.date,
      startTime: schema.seasonWeeks.startTime,
      endTime: schema.seasonWeeks.endTime,
      status: schema.seasonWeeks.status,
      notes: schema.seasonWeeks.notes,
      planId: schema.sessionPlans.id,
      planTitle: schema.sessionPlans.title,
      outcome: schema.sessionPlans.outcome,
      code: schema.ageGroups.code,
      groupName: schema.ageGroups.name,
      colour: schema.ageGroups.colour,
      ageGroupId: schema.seasonWeeks.ageGroupId,
    })
    .from(schema.seasonWeeks)
    .innerJoin(schema.ageGroups, eq(schema.ageGroups.id, schema.seasonWeeks.ageGroupId))
    .leftJoin(schema.sessionPlans, eq(schema.sessionPlans.id, schema.seasonWeeks.sessionPlanId))
    .where(and(eq(schema.seasonWeeks.seasonId, season.id), inArray(schema.seasonWeeks.ageGroupId, groupIds), ne(schema.seasonWeeks.status, "no_session")))
    .orderBy(asc(schema.seasonWeeks.date));
  const avail = weeks.length
    ? await db
        .select()
        .from(schema.coachAvailability)
        .where(and(eq(schema.coachAvailability.userId, userId), inArray(schema.coachAvailability.seasonWeekId, weeks.map((w) => w.id))))
    : [];
  const mine = new Map(avail.map((a) => [a.seasonWeekId, a.status as Availability]));
  return weeks.map((w) => ({ ...w, mine: mine.get(w.id) ?? null }));
}

export function replyUrl(origin: string, token: string, weekId: string, answer: Availability) {
  return `${origin}/cal/r/${token}/${weekId}?a=${answer}`;
}

/** The whole ICS document for one user's feed. */
export function feedIcs(origin: string, token: string, userName: string, weeks: Awaited<ReturnType<typeof feedWeeks>>, now?: Date) {
  const codes = [...new Set(weeks.map((w) => w.code))];
  const events: IcsEvent[] = weeks.map((w) => {
    const cancelled = w.status === "cancelled";
    const prefix = cancelled ? "Cancelled: " : w.mine ? `${ANSWER[w.mine].emoji} ` : "❓ Reply? ";
    const lines = [
      w.planTitle ? `Plan: ${w.planTitle}` : "No plan assigned yet",
      ...(w.outcome ? [`Outcome: ${w.outcome}`] : []),
      ...(w.notes ? [`Notes: ${w.notes}`] : []),
    ];
    if (!cancelled) {
      lines.push(
        "",
        `Your answer: ${w.mine ? `${ANSWER[w.mine].emoji} ${ANSWER[w.mine].label}` : "not given yet"}`,
        `${ANSWER.available.emoji} I can make it: ${replyUrl(origin, token, w.id, "available")}`,
        `${ANSWER.maybe.emoji} Maybe: ${replyUrl(origin, token, w.id, "maybe")}`,
        `${ANSWER.unavailable.emoji} Can't make it: ${replyUrl(origin, token, w.id, "unavailable")}`,
      );
    }
    if (w.planId) lines.push("", `Session plan: ${origin}/sessions/${w.planId}`);
    return {
      uid: `week-${w.id}@minis-coach`,
      date: w.date,
      start: w.startTime,
      end: w.endTime,
      summary: `${prefix}${w.code} training`,
      description: lines.join("\n"),
      url: w.planId ? `${origin}/sessions/${w.planId}` : `${origin}/season`,
      status: cancelled ? "CANCELLED" : "CONFIRMED",
    };
  });
  return buildIcs({
    name: `Minis Coach${codes.length ? `: ${codes.join(", ")}` : ""}`,
    description: `Training sessions for ${userName}. Tap a link in an event to tell the club whether you can make it.`,
    events,
    now,
  });
}
