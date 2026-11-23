"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Copy, MoreHorizontal, Pencil, Printer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, LinkButton, Select } from "@/components/ui";

type Props = {
  planId: string;
  ageGroupId: string | null;
  groups: { id: string; code: string }[];
  duplicate: (form: FormData) => Promise<void>;
};

/** Desktop: Print · [age] Duplicate · Edit inline. Phones: Edit + a "⋯" menu. */
export function PlanActions({ planId, ageGroupId, groups, duplicate, variant }: Props & { variant: "desktop" | "mobile" }) {
  const dupForm = (
    <form action={duplicate} className="flex gap-1">
      <Select name="ageGroupId" defaultValue={ageGroupId ?? ""} className="h-10 w-24" aria-label="Copy to age group">
        {groups.map((g) => <option key={g.id} value={g.id}>{g.code}</option>)}
      </Select>
      <Button variant="secondary"><Copy className="size-4" /> Duplicate</Button>
    </form>
  );

  if (variant === "desktop") {
    return (
      <div className="no-print hidden flex-wrap gap-2 sm:flex">
        <Button variant="secondary" onClick={() => window.print()}><Printer className="size-4" /> Print</Button>
        {dupForm}
        <LinkButton href={`/sessions/${planId}/edit`}><Pencil className="size-4" /> Edit plan</LinkButton>
      </div>
    );
  }
  return <MobileActions planId={planId} dupForm={dupForm} />;
}

function MobileActions({ planId, dupForm }: { planId: string; dupForm: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  return (
    <div ref={ref} className="no-print relative flex items-center gap-1 sm:hidden">
      <LinkButton href={`/sessions/${planId}/edit`} size="sm"><Pencil className="size-4" /> Edit</LinkButton>
      <button onClick={() => setOpen((o) => !o)} aria-label="More plan actions" aria-expanded={open} className="flex size-10 items-center justify-center rounded-xl text-muted hover:bg-surface-2">
        <MoreHorizontal className="size-5" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="absolute top-full right-0 z-30 mt-2 w-64 space-y-3 rounded-2xl border border-border bg-surface p-3 shadow-xl"
            role="menu"
          >
            <Button variant="secondary" className="w-full justify-start" onClick={() => { setOpen(false); window.print(); }}><Printer className="size-4" /> Print</Button>
            <div>
              <div className="mb-1.5 text-xs font-medium text-muted">Copy this plan to an age group</div>
              {dupForm}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
