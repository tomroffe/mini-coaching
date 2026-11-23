"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  CalendarDays,
  ClipboardCheck,
  Home,
  LayoutList,
  LogOut,
  Menu,
  Moon,
  Settings,
  Shapes,
  Sun,
  UserCog,
  UserRoundCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Role = "admin" | "coach" | "parent";

const ITEMS = [
  { href: "/", label: "Home", icon: Home, roles: ["admin", "coach"], mobile: true },
  { href: "/season", label: "Season", icon: CalendarDays, roles: ["admin", "coach"], mobile: true },
  { href: "/register", label: "Register", icon: ClipboardCheck, roles: ["admin", "coach"], mobile: true },
  { href: "/players", label: "Players", icon: Users, roles: ["admin", "coach"], mobile: true },
  { href: "/sessions", label: "Plans", icon: LayoutList, roles: ["admin", "coach"] },
  { href: "/drills", label: "Drills", icon: Shapes, roles: ["admin", "coach"] },
  { href: "/coaches", label: "Coaches", icon: UserRoundCheck, roles: ["admin", "coach"] },
  { href: "/awards", label: "Awards", icon: Award, roles: ["admin", "coach"] },
  { href: "/parent", label: "My child", icon: Home, roles: ["parent"], mobile: true },
  { href: "/parent/schedule", label: "Schedule", icon: CalendarDays, roles: ["parent"], mobile: true },
  { href: "/parent/account", label: "Account", icon: UserCog, roles: ["parent"], mobile: true },
  { href: "/admin", label: "Admin", icon: Settings, roles: ["admin"] },
] as const;

function matches(path: string, href: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
}

export function Nav({ user }: { user: { name: string; role: Role } }) {
  const path = usePathname();
  const items = ITEMS.filter((i) => (i.roles as readonly string[]).includes(user.role));
  const mobileItems = items.filter((i) => "mobile" in i && i.mobile);
  // Only the most specific matching link is active (/parent vs /parent/account)
  const activeHref = items.filter((i) => matches(path, i.href)).sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const isActive = (_: string, href: string) => href === activeHref;
  const moreItems = items.filter((i) => !("mobile" in i && i.mobile));
  const activeItem = items.find((i) => i.href === activeHref);
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => setMoreOpen(false), [path]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-surface lg:flex">
        <Link href="/" className="flex items-center gap-3 px-5 py-5">
          <Logo />
          <div className="leading-tight">
            <div className="font-display text-lg font-bold">Minis Coach</div>
            <div className="text-xs text-muted">Minis rugby</div>
          </div>
        </Link>
        <nav className="flex-1 space-y-0.5 px-3">
          {items.map((i) => {
            const active = isActive(path, i.href);
            return (
              <Link
                key={i.href}
                href={i.href}
                className={cn("relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition", active ? "text-brand" : "text-muted hover:bg-surface-2 hover:text-text")}
              >
                {active && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-xl bg-brand-soft" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
                <i.icon className="relative size-4.5" />
                <span className="relative">{i.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <div className="flex items-center justify-between gap-2 px-2 py-1">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{user.name}</div>
              <div className="text-xs capitalize text-muted">{user.role}</div>
            </div>
            <div className="flex">
              <ThemeToggle />
              <form action="/logout" method="post">
                <button className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-text" title="Sign out" aria-label="Sign out">
                  <LogOut className="size-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile top bar: logo + where you are */}
      <header className="no-print sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-surface/85 px-4 py-2.5 backdrop-blur lg:hidden" style={{ paddingTop: "max(0.625rem, env(safe-area-inset-top))" }}>
        <Link href={user.role === "parent" ? "/parent" : "/"} className="flex items-center gap-2" aria-label="Minis Coach home">
          <Logo size={28} />
          <span className="font-display font-bold">Minis Coach</span>
        </Link>
        {activeItem && activeItem.href !== "/" && (
          <span className="truncate text-sm text-muted">
            <span className="mr-1.5 text-border">/</span>
            {activeItem.label}
          </span>
        )}
      </header>

      {/* Mobile bottom tabs */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface/95 backdrop-blur lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} aria-label="Main">
        {mobileItems.map((i) => {
          const active = isActive(path, i.href) && !moreOpen;
          return (
            <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined} className={cn("relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium", active ? "text-brand" : "text-muted")}>
              {active && <motion.span layoutId="tab-dot" className="absolute top-0 h-0.5 w-8 rounded-full bg-brand" />}
              <i.icon className="size-5" />
              {i.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen((o) => !o)}
          aria-expanded={moreOpen}
          aria-controls="more-sheet"
          className={cn("relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium", moreOpen || moreItems.some((m) => m.href === activeHref) ? "text-brand" : "text-muted")}
        >
          {!moreOpen && moreItems.some((m) => m.href === activeHref) && <motion.span layoutId="tab-dot" className="absolute top-0 h-0.5 w-8 rounded-full bg-brand" />}
          <Menu className="size-5" />
          More
        </button>
      </nav>

      {/* "More" bottom sheet */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div className="no-print fixed inset-0 z-30 bg-black/40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMoreOpen(false)} />
            <motion.div
              id="more-sheet"
              role="dialog"
              aria-label="More"
              className="no-print fixed inset-x-0 bottom-0 z-30 rounded-t-3xl border-t border-border bg-surface px-4 pt-3 shadow-2xl lg:hidden"
              style={{ paddingBottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 420, damping: 40 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => { if (info.offset.y > 80) setMoreOpen(false); }}
            >
              <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border" />
              <div className="mb-3 px-1">
                <div className="font-semibold">{user.name}</div>
                <div className="text-xs text-muted capitalize">{user.role}</div>
              </div>
              {moreItems.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {moreItems.map((i) => (
                    <Link
                      key={i.href}
                      href={i.href}
                      className={cn("flex flex-col items-center gap-1.5 rounded-2xl p-3 text-sm font-medium transition", isActive(path, i.href) ? "bg-brand-soft text-brand" : "bg-surface-2 text-text hover:bg-brand-soft")}
                    >
                      <i.icon className="size-6" />
                      {i.label}
                    </Link>
                  ))}
                </div>
              )}
              <div className="mt-3 divide-y divide-border rounded-2xl bg-surface-2">
                <ThemeToggle row />
                <form action="/logout" method="post">
                  <button className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-danger">
                    <LogOut className="size-5" /> Sign out
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export function Logo({ size = 36 }: { size?: number }) {
  // Stylised rugby ball on posts
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <rect width="40" height="40" rx="11" fill="var(--brand)" />
      <path d="M12 9v22M28 9v22M12 21h16" stroke="var(--accent)" strokeWidth="2.6" strokeLinecap="round" />
      <ellipse cx="20" cy="16" rx="7.5" ry="4.6" transform="rotate(-28 20 16)" fill="#fff" />
      <path d="M15.5 18.2 24.5 13.8" stroke="var(--brand)" strokeWidth="1.2" />
    </svg>
  );
}

function ThemeToggle({ row }: { row?: boolean }) {
  const [dark, setDark] = useState<boolean | null>(null);
  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    setDark(t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    const t = next ? "dark" : "light";
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem("theme", t);
    } catch {}
  };
  if (row) {
    return (
      <button type="button" onClick={toggle} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium">
        {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
        {dark ? "Light mode" : "Dark mode"}
      </button>
    );
  }
  return (
    <button className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-text" aria-label="Toggle dark mode" title="Toggle dark mode" onClick={toggle}>
      {dark ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
    </button>
  );
}
