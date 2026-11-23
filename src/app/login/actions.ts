"use server";

import { and, eq, gt, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { createSession, hashPassword, verifyPassword } from "@/lib/auth";

export type FormState = { error?: string } | undefined;

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").toLowerCase().trim();
  const password = String(form.get("password") ?? "");
  const [u] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  // Always run a verify to keep timing similar for unknown emails
  const ok = u?.passwordHash ? await verifyPassword(u.passwordHash, password) : (await hashPassword(password), false);
  if (!u || !ok || !u.active) return { error: "That email and password don't match." };
  await createSession(u.id);
  redirect(u.role === "parent" ? "/parent" : "/");
}

export async function acceptInvite(token: string, _: FormState, form: FormData): Promise<FormState> {
  const password = String(form.get("password") ?? "");
  if (password.length < 10) return { error: "Use at least 10 characters." };
  const [inv] = await db
    .select()
    .from(schema.invites)
    .where(and(eq(schema.invites.token, token), isNull(schema.invites.usedAt), gt(schema.invites.expiresAt, new Date())));
  if (!inv) return { error: "This invite link has expired or was already used. Ask an admin for a new one." };

  const passwordHash = await hashPassword(password);
  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, inv.email));
  let userId: string;
  if (existing) {
    await db.update(schema.users).set({ passwordHash, active: true }).where(eq(schema.users.id, existing.id));
    userId = existing.id;
  } else {
    const [u] = await db.insert(schema.users).values({ email: inv.email, name: inv.name, role: inv.role, passwordHash }).returning();
    userId = u.id;
  }
  await db.update(schema.invites).set({ usedAt: new Date() }).where(eq(schema.invites.token, token));
  await createSession(userId);
  redirect(inv.role === "parent" ? "/parent" : "/");
}
