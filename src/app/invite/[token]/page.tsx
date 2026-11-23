import { and, eq, gt, isNull } from "drizzle-orm";
import { Logo } from "@/components/shell/nav";
import { db, schema } from "@/db";
import { InviteForm } from "../../login/form";

export const metadata = { title: "Accept invite" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [inv] = await db
    .select()
    .from(schema.invites)
    .where(and(eq(schema.invites.token, token), isNull(schema.invites.usedAt), gt(schema.invites.expiresAt, new Date())));
  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Logo size={44} />
        {inv ? (
          <>
            <h1 className="mt-6 text-2xl font-bold">Welcome, {inv.name.split(" ")[0]}!</h1>
            <p className="mb-6 text-sm text-muted">
              You&apos;ve been invited as a <strong>{inv.role}</strong>. Choose a password to finish setting up.
            </p>
            <InviteForm token={token} email={inv.email} />
          </>
        ) : (
          <>
            <h1 className="mt-6 text-2xl font-bold">Invite not valid</h1>
            <p className="text-muted">This link has expired or was already used. Ask a club admin for a new one.</p>
          </>
        )}
      </div>
    </div>
  );
}
