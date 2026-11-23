import "server-only";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { db, schema } from "@/db";
import type { AccessContext } from "./access";
import { getUser, requireUser, type Role, type SessionUser } from "./auth";

export * from "./access";

/** Build the access context for the current user (memoised per request). */
export const getAccess = cache(async (): Promise<(AccessContext & { user: SessionUser }) | null> => {
  const user = await getUser();
  if (!user) return null;
  const [assignments, children] = await Promise.all([
    user.role === "coach"
      ? db.select({ id: schema.coachAssignments.ageGroupId }).from(schema.coachAssignments).where(eq(schema.coachAssignments.userId, user.id))
      : Promise.resolve([]),
    user.role === "parent"
      ? db.select({ id: schema.playerGuardians.playerId }).from(schema.playerGuardians).where(eq(schema.playerGuardians.userId, user.id))
      : Promise.resolve([]),
  ]);
  return {
    user,
    role: user.role,
    ageGroupIds: assignments.map((a) => a.id),
    childIds: children.map((c) => c.id),
  };
});

export async function requireAccess(roles?: Role[]) {
  await requireUser(roles);
  return (await getAccess())!;
}

export class ForbiddenError extends Error {
  constructor(msg = "You don't have permission to do that") {
    super(msg);
  }
}

export function assert(cond: unknown, msg?: string): asserts cond {
  if (!cond) throw new ForbiddenError(msg);
}
