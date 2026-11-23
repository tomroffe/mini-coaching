import { Nav } from "@/components/shell/nav";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-dvh">
      <Nav user={{ name: user.name, role: user.role }} />
      <main className="mx-auto max-w-7xl px-4 pt-5 pb-28 sm:px-6 lg:ml-60 lg:px-10 lg:pt-8 lg:pb-12">{children}</main>
    </div>
  );
}
