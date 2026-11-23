"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { createSession, getUser, hashPassword, verifyPassword } from "@/lib/auth";

export type EnrolState = { error?: string } | undefined;

const name = z.string().trim().min(1, "Enter first and last name").max(60, "Names must be under 60 characters");
const childSchema = z.object({
  firstName: name,
  lastName: name,
  dob: z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && v <= new Date().toISOString().slice(0, 10)), "Check the date of birth")
    .transform((v) => v || null),
  photoConsent: z.enum(["yes", "no"], { error: "Choose yes or no for photo consent" }).transform((v) => v === "yes"),
});

const inputSchema = z.object({
  mode: z.enum(["new", "existing", "session"]),
  parentName: z.string().trim().max(80).optional(),
  email: z.string().trim().toLowerCase().max(200).optional(),
  password: z.string().max(200).optional(),
  confirm: z.string().max(200).optional(),
  children: z.array(childSchema).min(1, "Add your child").max(4, "Up to 4 children per enrolment"),
});

export type EnrolInput = z.input<typeof inputSchema>;

class EnrolError extends Error {}

export async function completeEnrolment(token: string, _: EnrolState, input: EnrolInput): Promise<EnrolState> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue.path[0] === "children" && typeof issue.path[1] === "number" ? `Child ${issue.path[1] + 1}: ` : "";
    return { error: where + issue.message };
  }
  const v = parsed.data;

  // Resolve the parent account (outside the transaction: hashing is slow)
  let userId: string | null = null;
  let newUser: { name: string; email: string; passwordHash: string } | null = null;
  if (v.mode === "session") {
    const u = await getUser();
    if (!u || u.role !== "parent") return { error: "Please sign in again." };
    userId = u.id;
  } else if (v.mode === "existing") {
    const [u] = await db.select().from(schema.users).where(eq(schema.users.email, v.email ?? ""));
    const ok = u?.passwordHash ? await verifyPassword(u.passwordHash, v.password ?? "") : (await hashPassword(v.password ?? "x"), false);
    if (!u || !ok || !u.active) return { error: "That email and password don't match." };
    if (u.role !== "parent") return { error: "That's a coach/admin account. Ask a club admin to link your child to it." };
    userId = u.id;
  } else {
    if (!v.parentName) return { error: "Enter your name." };
    if (!v.email || !z.email().safeParse(v.email).success) return { error: "Enter a valid email address." };
    if ((v.password ?? "").length < 10) return { error: "Choose a password of at least 10 characters." };
    if (v.password !== v.confirm) return { error: "The passwords don't match." };
    const [exists] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, v.email));
    if (exists) return { error: "This email already has an account. Choose “I already have an account” and sign in." };
    newUser = { name: v.parentName, email: v.email, passwordHash: await hashPassword(v.password!) };
  }

  try {
    userId = await db.transaction(async (tx) => {
      const [link] = await tx.select().from(schema.enrolmentLinks).where(eq(schema.enrolmentLinks.token, token)).for("update");
      if (!link || link.usedAt || link.expiresAt < new Date()) throw new EnrolError("This code has expired or was already used. Ask the coach for a new QR code.");

      let uid = userId;
      if (newUser) {
        const [u] = await tx.insert(schema.users).values({ ...newUser, role: "parent" }).onConflictDoNothing().returning({ id: schema.users.id });
        if (!u) throw new EnrolError("This email already has an account. Choose “I already have an account” and sign in.");
        uid = u.id;
      }
      const kids = await tx
        .insert(schema.players)
        .values(v.children.map((c) => ({ firstName: c.firstName, lastName: c.lastName, dob: c.dob, photoConsent: c.photoConsent, ageGroupId: link.ageGroupId, enrolledVia: token })))
        .returning({ id: schema.players.id });
      await tx.insert(schema.playerGuardians).values(kids.map((k) => ({ playerId: k.id, userId: uid! }))).onConflictDoNothing();
      await tx
        .update(schema.enrolmentLinks)
        .set({ usedAt: new Date(), usedBy: uid })
        .where(eq(schema.enrolmentLinks.token, token));
      return uid!;
    });
  } catch (e) {
    if (e instanceof EnrolError) return { error: e.message };
    throw e;
  }

  await createSession(userId!);
  redirect("/parent?welcome=1");
}
