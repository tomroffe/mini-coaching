"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { replyFromCalendar } from "../../../actions";

type A = "available" | "maybe" | "unavailable";
const OPTIONS: { v: A; emoji: string; label: string; cls: string }[] = [
  { v: "available", emoji: "✅", label: "I can make it", cls: "border-emerald-500 bg-emerald-500/10" },
  { v: "maybe", emoji: "🤔", label: "Maybe", cls: "border-amber-400 bg-amber-400/10" },
  { v: "unavailable", emoji: "❌", label: "Can't make it", cls: "border-red-400 bg-red-500/10" },
];

/**
 * Saves only on a tap. Opening the link never changes anything, because link
 * scanners and calendar previews can fetch URLs on their own.
 */
export function ReplyButtons({ token, weekId, current, suggested }: { token: string; weekId: string; current: A | null; suggested?: A }) {
  const [saved, setSaved] = useState<A | null>(current);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const highlight = suggested && suggested !== saved ? suggested : null;

  return (
    <div className="mt-6 space-y-3">
      {OPTIONS.map((o) => {
        const isSaved = saved === o.v;
        return (
          <motion.button
            key={o.v}
            whileTap={{ scale: 0.97 }}
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError(null);
                const r = await replyFromCalendar(token, weekId, o.v);
                if (r.ok) {
                  setSaved(o.v);
                  setJustSaved(true);
                } else setError(r.error ?? "Something went wrong");
              })
            }
            className={cn(
              "flex w-full items-center gap-3 rounded-2xl border-2 bg-surface px-4 py-4 text-left text-lg font-semibold transition",
              isSaved ? o.cls : highlight === o.v ? "border-brand" : "border-border",
            )}
          >
            <span className="text-2xl">{o.emoji}</span>
            <span className="flex-1">{o.label}</span>
            {isSaved && <Check className="size-5 text-emerald-600" aria-label="Your current answer" />}
            {highlight === o.v && !isSaved && <span className="text-xs font-medium text-brand">Tap to confirm</span>}
          </motion.button>
        );
      })}
      <AnimatePresence>
        {justSaved && saved && (
          <motion.p role="status" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-brand-soft px-4 py-3 text-sm">
            Saved: {OPTIONS.find((o) => o.v === saved)!.emoji} {OPTIONS.find((o) => o.v === saved)!.label.toLowerCase()}. Your calendar will show this after its next refresh.
          </motion.p>
        )}
      </AnimatePresence>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <p className="pt-2 text-center text-sm text-muted">
        <Link href="/coaches" className="underline">Open Minis Coach</Link>
      </p>
    </div>
  );
}
