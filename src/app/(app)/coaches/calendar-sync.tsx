"use client";

import { CalendarPlus, Check, Copy, RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";
import { Button, Card, CardHeader } from "@/components/ui";
import { enableCalendar, resetCalendar } from "../../cal/actions";

export function CalendarSync({ feedUrl }: { feedUrl: string | null }) {
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const webcal = feedUrl?.replace(/^https?:\/\//, "webcal://");

  return (
    <Card id="calendar" className="scroll-mt-20">
      <CardHeader
        title="Calendar sync"
        subtitle="Put your coaching sessions in your own calendar. Each event has quick links to say whether you can make it."
      />
      <div className="space-y-4 px-5 pb-5">
        {!feedUrl ? (
          <Button onClick={() => start(() => enableCalendar())} disabled={pending}>
            <CalendarPlus className="size-4" /> {pending ? "Setting up…" : "Set up calendar sync"}
          </Button>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <a href={webcal} className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-medium whitespace-nowrap text-brand-fg shadow-sm">
                <CalendarPlus className="size-4" /> Apple / Outlook
              </a>
              <a
                href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal!)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-medium whitespace-nowrap hover:bg-surface-2"
              >
                <CalendarPlus className="size-4" /> Google Calendar
              </a>
              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(feedUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  } catch {}
                }}
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy link"}
              </Button>
            </div>
            <code className="block truncate rounded-lg bg-surface-2 px-3 py-2 text-xs" data-testid="calendar-feed-url">{feedUrl}</code>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
              <li>Event titles show your answer: ✅ in, 🤔 maybe, ❌ can&apos;t, or ❓ if you haven&apos;t replied.</li>
              <li>Open an event and tap a link to answer; no sign-in needed. Cancelled sessions show as cancelled.</li>
              <li>Apple and Outlook refresh about hourly; Google can take several hours.</li>
              <li>Keep this link private: anyone with it can see your sessions and reply as you.</li>
            </ul>
            {confirmReset ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-3 text-sm">
                <span className="flex-1">Reset the link? Your current calendar subscription will stop updating.</span>
                <Button size="sm" variant="danger" disabled={pending} onClick={() => start(async () => { await resetCalendar(); setConfirmReset(false); })}>Reset</Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Button>
              </div>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setConfirmReset(true)}>
                <RefreshCw className="size-4" /> Reset link
              </Button>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
