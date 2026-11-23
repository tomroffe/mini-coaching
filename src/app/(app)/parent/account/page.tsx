import { and, inArray, ne } from "drizzle-orm";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { db, schema } from "@/db";
import { requireAccess } from "@/lib/authz";
import { visiblePlayers } from "@/lib/queries";
import { DeleteAccount, UnenrolChild } from "./forms";

export const metadata = { title: "Account" };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ unenrolled?: string }> }) {
  const ctx = await requireAccess(["parent"]);
  const { unenrolled } = await searchParams;
  const kids = await visiblePlayers(ctx);
  const ids = kids.map((k) => k.id);
  const [groups, shared] = await Promise.all([
    db.select().from(schema.ageGroups),
    ids.length
      ? db
          .selectDistinct({ playerId: schema.playerGuardians.playerId })
          .from(schema.playerGuardians)
          .where(and(inArray(schema.playerGuardians.playerId, ids), ne(schema.playerGuardians.userId, ctx.user.id)))
      : Promise.resolve([]),
  ]);
  const sharedIds = new Set(shared.map((s) => s.playerId));

  return (
    <>
      <PageHeader eyebrow="Parent view" title="Your account" subtitle={`Signed in as ${ctx.user.name} (${ctx.user.email}).`} />
      {unenrolled && (
        <Card className="mb-6 border-brand/40 bg-brand-soft p-4 text-sm" role="status">
          {unenrolled} has been unenrolled and their record deleted.
        </Card>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Unenrol a child" subtitle="Removes your child from the minis section. Their record, attendance, awards and any photo are permanently deleted." />
          <div className="space-y-3 px-5 pb-5">
            {kids.length === 0 && <p className="text-sm text-muted">No children linked to your account.</p>}
            {kids.map((k) => (
              <UnenrolChild
                key={k.id}
                playerId={k.id}
                firstName={k.firstName}
                lastName={k.lastName}
                group={groups.find((g) => g.id === k.ageGroupId)?.code}
                shared={sharedIds.has(k.id)}
              />
            ))}
          </div>
        </Card>
        <Card className="self-start border-red-500/30">
          <CardHeader title="Delete your account" subtitle="Signs you out and permanently deletes your login." />
          <div className="px-5 pb-5">
            <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-muted">
              {kids.map((k) =>
                sharedIds.has(k.id) ? (
                  <li key={k.id}><span className="text-text">{k.firstName}</span> stays enrolled: another parent is linked to them.</li>
                ) : (
                  <li key={k.id}><span className="text-text">{k.firstName}</span> will be unenrolled and their record deleted.</li>
                ),
              )}
              <li>This can&apos;t be undone.</li>
            </ul>
            <DeleteAccount />
          </div>
        </Card>
      </div>
    </>
  );
}
