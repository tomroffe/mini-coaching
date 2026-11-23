import { redirect } from "next/navigation";
import { HeroPitch } from "@/components/diagram/hero-pitch";
import { Logo } from "@/components/shell/nav";
import { getUser } from "@/lib/auth";
import { LoginForm } from "./form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { deleted } = await searchParams;
  const u = await getUser();
  if (u) redirect(u.role === "parent" ? "/parent" : "/");
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-brand lg:block">
        <HeroPitch />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-10 text-white">
          <h2 className="text-3xl font-bold">Plan it. Coach it. Celebrate it.</h2>
          <p className="mt-2 max-w-md text-white/80">Session plans, animated drills, registers and awards for the minis section.</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3">
            <Logo size={44} />
            <div>
              <div className="font-display text-xl font-bold">Minis Coach</div>
              <div className="text-sm text-muted">Colchester Rugby Club</div>
            </div>
          </div>
          {deleted && (
            <p className="mb-6 rounded-xl bg-brand-soft px-4 py-3 text-sm" role="status">
              Your account has been deleted. Thanks for being part of Colchester RC Minis.
            </p>
          )}
          <h1 className="mb-1 text-2xl font-bold">Sign in</h1>
          <p className="mb-6 text-sm text-muted">New coach or parent? Use the invite link you were sent.</p>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
