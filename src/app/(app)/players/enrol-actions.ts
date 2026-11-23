"use server";

import { randomBytes } from "node:crypto";
import { and, eq, isNull, lt } from "drizzle-orm";
import QRCode from "qrcode";
import { db, schema } from "@/db";
import { assert, canManageAgeGroup, requireAccess } from "@/lib/authz";
import { appOrigin } from "@/lib/origin";

const TTL_MS = 30 * 60 * 1000;

export type EnrolmentLink = { token: string; url: string; svg: string; expiresAt: string; group: string };

export async function createEnrolmentLink(ageGroupId: string): Promise<EnrolmentLink> {
  const ctx = await requireAccess(["admin", "coach"]);
  assert(canManageAgeGroup(ctx, ageGroupId), "You can only enrol families into age groups you coach");
  const [group] = await db.select().from(schema.ageGroups).where(eq(schema.ageGroups.id, ageGroupId));
  assert(group, "Age group not found");

  // Tidy up expired, unused codes. Live codes are kept: a parent may still be mid-form on one.
  await db.delete(schema.enrolmentLinks).where(and(isNull(schema.enrolmentLinks.usedAt), lt(schema.enrolmentLinks.expiresAt, new Date())));

  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + TTL_MS);
  await db.insert(schema.enrolmentLinks).values({ token, ageGroupId, createdBy: ctx.user.id, expiresAt });

  const url = `${await appOrigin()}/enrol/${token}`;
  const svg = await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 1, color: { dark: "#0b0b0b", light: "#ffffff" } });
  return { token, url, svg, expiresAt: expiresAt.toISOString(), group: group.code };
}

async function ownLink(token: string) {
  const ctx = await requireAccess(["admin", "coach"]);
  const [link] = await db.select().from(schema.enrolmentLinks).where(eq(schema.enrolmentLinks.token, token));
  if (!link) return null;
  assert(ctx.role === "admin" || link.createdBy === ctx.user.id);
  return link;
}

export async function enrolmentStatus(token: string): Promise<{ used: boolean; expired: boolean; children: string[]; parent?: string }> {
  const link = await ownLink(token);
  if (!link) return { used: false, expired: true, children: [] };
  if (!link.usedAt) return { used: false, expired: link.expiresAt < new Date(), children: [] };
  const [kids, parent] = await Promise.all([
    db.select({ first: schema.players.firstName, last: schema.players.lastName }).from(schema.players).where(eq(schema.players.enrolledVia, token)),
    link.usedBy ? db.select({ name: schema.users.name }).from(schema.users).where(eq(schema.users.id, link.usedBy)) : Promise.resolve([]),
  ]);
  return { used: true, expired: false, children: kids.map((k) => `${k.first} ${k.last}`), parent: parent[0]?.name };
}

export async function cancelEnrolmentLink(token: string) {
  const link = await ownLink(token);
  if (link && !link.usedAt) await db.delete(schema.enrolmentLinks).where(eq(schema.enrolmentLinks.token, token));
}
