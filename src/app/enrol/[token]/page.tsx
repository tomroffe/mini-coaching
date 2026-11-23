import { eq } from "drizzle-orm";
import { Logo } from "@/components/shell/nav";
import { db, schema } from "@/db";
import { getUser } from "@/lib/auth";
import { EnrolForm } from "./form";

export const metadata = { title: "Enrol your child" };

export default async function EnrolPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [row] = await db
    .select({ link: schema.enrolmentLinks, code: schema.ageGroups.code, groupName: schema.ageGroups.name, colour: schema.ageGroups.colour })
    .from(schema.enrolmentLinks)
    .innerJoin(schema.ageGroups, eq(schema.ageGroups.id, schema.enrolmentLinks.ageGroupId))
    .where(eq(schema.enrolmentLinks.token, token));
  const valid = row && !row.link.usedAt && row.link.expiresAt > new Date();
  const user = await getUser();

  return (
    <div className="min-h-dvh bg-bg">
      <div className="h-2" style={{ background: row?.colour ?? "var(--brand)" }} />
      <div className="mx-auto max-w-lg px-5 pt-8 pb-16">
        <div className="mb-6 flex items-center gap-3">
          <Logo size={44} />
          <div>
            <div className="font-display text-lg font-bold">Colchester RC Minis</div>
            <div className="text-sm text-muted">Minis Coach</div>
          </div>
        </div>
        {valid ? (
          <>
            <h1 className="text-2xl font-bold">
              Join{" "}
              <span className="rounded-lg px-2 py-0.5 text-white" style={{ background: row.colour }}>
                {row.code}
              </span>
            </h1>
            <p className="mt-2 mb-6 text-muted">
              Set up your parent account and add your child to the {row.groupName}. You&apos;ll be able to see training sessions, attendance and awards.
            </p>
            <EnrolForm token={token} signedInAs={user?.role === "parent" ? user.name : undefined} />
          </>
        ) : (
          <div className="mt-10 text-center">
            <div className="text-5xl">⏱️</div>
            <h1 className="mt-4 text-2xl font-bold">This code has expired</h1>
            <p className="mt-2 text-muted">Enrolment QR codes work once and only for 30 minutes. Ask the coach to show you a new one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
