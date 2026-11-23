import { asc, eq } from "drizzle-orm";
import { ArrowLeft, UserPlus } from "lucide-react";
import Link from "next/link";
import { LinkButton, PageHeader } from "@/components/ui";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { PeopleTable, type Person } from "./table";

export const metadata = { title: "People" };

export default async function PeoplePage() {
  const me = await requireAdmin();
  const [users, assignments, guardians, groups] = await Promise.all([
    db.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email, role: schema.users.role, active: schema.users.active, createdAt: schema.users.createdAt }).from(schema.users).orderBy(asc(schema.users.name)),
    db.select({ userId: schema.coachAssignments.userId, role: schema.coachAssignments.role, code: schema.ageGroups.code, colour: schema.ageGroups.colour, sort: schema.ageGroups.sortOrder })
      .from(schema.coachAssignments)
      .innerJoin(schema.ageGroups, eq(schema.ageGroups.id, schema.coachAssignments.ageGroupId)),
    db.select({ userId: schema.playerGuardians.userId, playerId: schema.players.id, first: schema.players.firstName, last: schema.players.lastName, groupId: schema.players.ageGroupId })
      .from(schema.playerGuardians)
      .innerJoin(schema.players, eq(schema.players.id, schema.playerGuardians.playerId)),
    db.select().from(schema.ageGroups),
  ]);
  const guardianCount = new Map<string, number>();
  for (const g of guardians) guardianCount.set(g.playerId, (guardianCount.get(g.playerId) ?? 0) + 1);
  const gCode = new Map(groups.map((g) => [g.id, g.code]));

  const people: Person[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    active: u.active,
    joined: u.createdAt.toISOString().slice(0, 10),
    groups: assignments
      .filter((a) => a.userId === u.id)
      .sort((a, b) => a.sort - b.sort)
      .map((a) => ({ code: a.code, colour: a.colour, head: a.role === "head" })),
    children: guardians
      .filter((g) => g.userId === u.id)
      .map((g) => ({ id: g.playerId, name: `${g.first} ${g.last}`, group: g.groupId ? gCode.get(g.groupId) : undefined, onlyParent: guardianCount.get(g.playerId) === 1 })),
  }));

  return (
    <>
      <Link href="/admin" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-text"><ArrowLeft className="size-4" /> Admin</Link>
      <PageHeader
        eyebrow="Admin"
        title="People"
        subtitle="Everyone with a login: admins, coaches and parents."
        actions={<LinkButton href="/admin#invite"><UserPlus className="size-4" /> Invite someone</LinkButton>}
      />
      <PeopleTable people={people} meId={me.id} />
    </>
  );
}
