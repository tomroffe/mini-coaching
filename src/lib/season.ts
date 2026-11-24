/** Pure season helpers (unit-tested). */

export type WeekLite = { id: string; date: string; status: "training" | "cancelled" | "no_session"; planId: string | null };

/**
 * A session was cancelled: per the coaching plan, "move the sequence forward rather than
 * skipping the learning objective". The cancelled week loses its plan, and every plan from
 * that week onwards slides to the next available training week. Plans that fall off the end
 * of the season are returned in `dropped`.
 */
export function cancelAndShift(weeks: WeekLite[], cancelId: string): { updates: { id: string; status: WeekLite["status"]; planId: string | null }[]; dropped: string[] } {
  const sorted = [...weeks].sort((a, b) => a.date.localeCompare(b.date));
  const idx = sorted.findIndex((w) => w.id === cancelId);
  if (idx < 0) return { updates: [], dropped: [] };

  const tail = sorted.slice(idx);
  const queue = tail.filter((w) => w.status === "training" && w.planId).map((w) => w.planId!);
  // after cancelling, training slots are the remaining training weeks after the cancelled one
  const slots = tail.slice(1).filter((w) => w.status === "training");

  const updates: { id: string; status: WeekLite["status"]; planId: string | null }[] = [{ id: sorted[idx].id, status: "cancelled", planId: null }];
  for (const slot of slots) {
    const next = queue.shift() ?? null;
    if (slot.planId !== next) updates.push({ id: slot.id, status: "training", planId: next });
  }
  return { updates, dropped: queue };
}

/** All Sundays (or another weekday) between two ISO dates, inclusive. */
export function weekdaysBetween(startISO: string, endISO: string, weekday = 0): string[] {
  const out: string[] = [];
  const d = new Date(startISO + "T12:00:00Z");
  const end = new Date(endISO + "T12:00:00Z");
  while (d.getUTCDay() !== weekday) d.setUTCDate(d.getUTCDate() + 1);
  for (; d <= end; d.setUTCDate(d.getUTCDate() + 7)) out.push(d.toISOString().slice(0, 10));
  return out;
}
