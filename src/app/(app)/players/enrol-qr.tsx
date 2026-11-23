"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, QrCode, RefreshCw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { cancelEnrolmentLink, createEnrolmentLink, enrolmentStatus, type EnrolmentLink } from "./enrol-actions";

type Group = { id: string; code: string; colour: string };
type Status = { used: boolean; expired: boolean; children: string[]; parent?: string };

export function EnrolQr({ groups, defaultGroupId }: { groups: Group[]; defaultGroupId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [groupId, setGroupId] = useState(defaultGroupId);
  const [link, setLink] = useState<EnrolmentLink | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [now, setNow] = useState(() => Date.now());
  const enrolledAny = useRef(false);
  const group = groups.find((g) => g.id === groupId) ?? groups[0];

  const generate = useCallback(
    (gid: string) =>
      start(async () => {
        setError(null);
        setStatus(null);
        try {
          setLink(await createEnrolmentLink(gid));
        } catch (e) {
          setError((e as Error).message);
        }
      }),
    [],
  );

  // Poll for the parent finishing enrolment
  useEffect(() => {
    if (!link || status?.used) return;
    const t = setInterval(async () => {
      const s = await enrolmentStatus(link.token);
      setStatus(s);
      if (s.used) enrolledAny.current = true;
    }, 2000);
    return () => clearInterval(t);
  }, [link, status?.used]);

  // Countdown tick
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [open]);

  // Keep the phone screen awake while the QR is showing
  useEffect(() => {
    if (!open || !link || !("wakeLock" in navigator)) return;
    let lock: { release: () => Promise<void> } | undefined;
    (navigator as Navigator & { wakeLock: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock
      .request("screen")
      .then((l) => (lock = l))
      .catch(() => {});
    return () => void lock?.release().catch(() => {});
  }, [open, link]);

  function close() {
    if (link && !status?.used) void cancelEnrolmentLink(link.token);
    setOpen(false);
    setLink(null);
    setStatus(null);
    if (enrolledAny.current) router.refresh();
    enrolledAny.current = false;
  }

  const msLeft = link ? new Date(link.expiresAt).getTime() - now : 0;
  const expired = !!link && !status?.used && msLeft <= 0;
  const mm = Math.max(0, Math.floor(msLeft / 60000));
  const ss = Math.max(0, Math.floor((msLeft % 60000) / 1000));

  return (
    <>
      <Button variant="secondary" onClick={() => { setOpen(true); generate(groupId); }}>
        <QrCode className="size-4" /> Enrol a family
      </Button>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}>
            <motion.div
              role="dialog"
              aria-label="Enrol a family"
              className="relative w-full max-w-sm rounded-3xl bg-surface p-6 text-center shadow-2xl"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={close} aria-label="Close" className="absolute top-4 right-4 text-muted hover:text-text"><X className="size-5" /></button>
              <h2 className="text-xl font-bold">Enrol a family</h2>
              <p className="mt-1 text-sm text-muted">Ask the parent to scan with their phone camera.</p>

              {groups.length > 1 && (
                <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                  {groups.map((g) => (
                    <button
                      key={g.id}
                      disabled={pending}
                      onClick={() => { if (link && !status?.used) void cancelEnrolmentLink(link.token); setGroupId(g.id); generate(g.id); }}
                      className={cn("rounded-full px-3 py-1 text-sm font-semibold transition", g.id === groupId ? "text-white" : "bg-surface-2 text-muted")}
                      style={g.id === groupId ? { background: g.colour } : undefined}
                    >
                      {g.code}
                    </button>
                  ))}
                </div>
              )}

              <div className="relative mx-auto mt-5 aspect-square w-full max-w-[17rem]">
                <AnimatePresence mode="wait">
                  {status?.used ? (
                    <motion.div key="done" className="flex h-full flex-col items-center justify-center rounded-2xl bg-emerald-500/10 p-4" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15, type: "spring", stiffness: 400, damping: 15 }}>
                        <CheckCircle2 className="size-16 text-emerald-500" />
                      </motion.div>
                      <div className="mt-3 font-semibold" data-testid="enrolled-names">{status.children.join(", ")}</div>
                      <div className="text-sm text-muted">enrolled in {group?.code}{status.parent && ` by ${status.parent}`}</div>
                    </motion.div>
                  ) : link && !expired ? (
                    <motion.div
                      key={link.token}
                      className="h-full rounded-2xl bg-white p-3 shadow-inner ring-4 [&_svg]:h-full [&_svg]:w-full"
                      style={{ ["--tw-ring-color" as string]: group?.colour }}
                      initial={{ opacity: 0, rotateY: 90 }}
                      animate={{ opacity: 1, rotateY: 0 }}
                      exit={{ opacity: 0 }}
                      dangerouslySetInnerHTML={{ __html: link.svg }}
                      data-enrol-url={link.url}
                      aria-label={`QR code to enrol in ${link.group}`}
                    />
                  ) : (
                    <motion.div key="wait" className="flex h-full items-center justify-center rounded-2xl bg-surface-2 text-sm text-muted">
                      {expired ? "Code expired" : error ?? "Creating code…"}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {link && !status?.used && !expired && (
                <div className="mt-3 space-y-1">
                  <div className="text-sm font-medium tabular-nums">Single use · expires in {mm}:{String(ss).padStart(2, "0")}</div>
                  <a href={link.url} target="_blank" rel="noreferrer" className="block truncate text-xs text-muted underline">{link.url}</a>
                </div>
              )}

              <div className="mt-5 flex justify-center gap-2">
                {(status?.used || expired || error) && (
                  <Button onClick={() => generate(groupId)} disabled={pending}><RefreshCw className="size-4" /> {status?.used ? "Show a new QR" : "New QR"}</Button>
                )}
                <Button variant="ghost" onClick={close}>Done</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
