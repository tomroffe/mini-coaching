import { awardType } from "@/lib/awards";

/** Small "■ Badge" label: same colour swatch as the awards chart legend. Text stays in text colours. */
export function AwardTypeTag({ type }: { type: string }) {
  const t = awardType(type);
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-muted">
      <span className="size-2 rounded-sm" style={{ background: t.colour }} aria-hidden />
      {t.label}
    </span>
  );
}
