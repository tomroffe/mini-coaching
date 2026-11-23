/**
 * Pure access rules (no DB, no Next imports) so they can be unit-tested.
 * Data loaders build an AccessContext once per request and pass it in.
 */
export type AccessContext = {
  role: "admin" | "coach" | "parent";
  /** age groups a coach is assigned to */
  ageGroupIds: string[];
  /** players a parent is guardian of */
  childIds: string[];
};

export type PlayerLike = { id: string; ageGroupId: string | null };

export function isStaff(ctx: AccessContext) {
  return ctx.role === "admin" || ctx.role === "coach";
}

/** Can view a player's basic profile (name, photo if consented, awards, attendance). */
export function canViewPlayer(ctx: AccessContext, p: PlayerLike): boolean {
  if (ctx.role === "admin") return true;
  if (ctx.role === "coach") return !!p.ageGroupId && ctx.ageGroupIds.includes(p.ageGroupId);
  return ctx.childIds.includes(p.id);
}

/** Medical notes / emergency contacts: staff for that player only (and the child's own parent). */
export function canViewSensitive(ctx: AccessContext, p: PlayerLike): boolean {
  return canViewPlayer(ctx, p);
}

/** Edit player records, take the register, give awards. */
export function canManagePlayer(ctx: AccessContext, p: PlayerLike): boolean {
  if (ctx.role === "admin") return true;
  if (ctx.role === "coach") return !!p.ageGroupId && ctx.ageGroupIds.includes(p.ageGroupId);
  return false;
}

export function canManageAgeGroup(ctx: AccessContext, ageGroupId: string): boolean {
  if (ctx.role === "admin") return true;
  return ctx.role === "coach" && ctx.ageGroupIds.includes(ageGroupId);
}

/** Drills and plans are a shared club library: any coach may create and edit. */
export function canEditLibrary(ctx: AccessContext): boolean {
  return isStaff(ctx);
}

/** Photo upload is only allowed once consent is recorded. */
export function canUploadPhoto(ctx: AccessContext, p: PlayerLike & { photoConsent: boolean }): boolean {
  return p.photoConsent && canManagePlayer(ctx, p);
}

/** Photo display: consent required, then same as profile visibility. */
export function canSeePhoto(ctx: AccessContext, p: PlayerLike & { photoConsent: boolean }): boolean {
  return p.photoConsent && canViewPlayer(ctx, p);
}

/** Change photo consent: the child's own parent, or staff who manage the player. */
export function canSetConsent(ctx: AccessContext, p: PlayerLike): boolean {
  if (ctx.role === "parent") return ctx.childIds.includes(p.id);
  return canManagePlayer(ctx, p);
}

/** Unenrol (permanently delete) a child: only the child's own parent, or an admin. */
export function canUnenrol(ctx: AccessContext, p: PlayerLike): boolean {
  if (ctx.role === "admin") return true;
  return ctx.role === "parent" && ctx.childIds.includes(p.id);
}
