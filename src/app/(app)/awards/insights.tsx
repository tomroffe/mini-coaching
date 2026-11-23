"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowDown, ArrowUp, BarChart3, Table2 } from "lucide-react";
import Link from "next/link";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Card } from "@/components/ui";
import { cn, fmtDate } from "@/lib/utils";

/** Fixed categorical order: colour follows the award type, never its rank. */
export const AWARD_TYPES = [
  { value: "player_of_week", label: "Player of the week", short: "POTW", colour: "var(--series-1)" },
  { value: "badge", label: "Badge", short: "Badges", colour: "var(--series-2)" },
  { value: "milestone", label: "Milestone", short: "Milestones", colour: "var(--series-3)" },
  { value: "certificate", label: "Certificate", short: "Certificates", colour: "var(--series-4)" },
] as const;
type AwardType = (typeof AWARD_TYPES)[number]["value"];

type Player = { id: string; name: string; groupId: string | null };
type Group = { id: string; code: string; colour: string };
type AwardLite = { playerId: string; type: AwardType; awardedOn: string; title: string };

type Row = Player & { counts: Record<AwardType, number>; total: number; last: AwardLite | null; group?: Group };

type SortKey = "name" | "group" | AwardType | "total" | "last";

export function AwardInsights({ players, groups, awards, season }: { players: Player[]; groups: Group[]; awards: AwardLite[]; season: { name: string; start: string; end: string } | null }) {
  const [groupId, setGroupId] = useState<string>("");
  const [scope, setScope] = useState<"season" | "all">(season ? "season" : "all");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [view, setView] = useState<"chart" | "table">("chart");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "total", dir: -1 });

  const gById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);

  const rows: Row[] = useMemo(() => {
    const inScope = awards.filter((a) => scope === "all" || !season || (a.awardedOn >= season.start && a.awardedOn <= season.end));
    return players
      .filter((p) => !groupId || p.groupId === groupId)
      .map((p) => {
        const mine = inScope.filter((a) => a.playerId === p.id);
        const counts = Object.fromEntries(AWARD_TYPES.map((t) => [t.value, mine.filter((a) => a.type === t.value).length])) as Record<AwardType, number>;
        const last = mine.reduce<AwardLite | null>((m, a) => (!m || a.awardedOn > m.awardedOn ? a : m), null);
        return { ...p, counts, total: mine.length, last, group: p.groupId ? gById.get(p.groupId) : undefined };
      });
  }, [players, awards, groupId, scope, season, gById]);

  const awarded = rows.filter((r) => r.total > 0).length;
  const missing = rows.filter((r) => r.total === 0);
  const totalAwards = rows.reduce((s, r) => s + r.total, 0);

  const coverageByGroup = useMemo(
    () =>
      groups
        .map((g) => {
          const rs = rows.filter((r) => r.groupId === g.id);
          return { g, n: rs.length, awarded: rs.filter((r) => r.total > 0).length };
        })
        .filter((x) => x.n > 0),
    [groups, rows],
  );

  const sorted = useMemo(() => {
    const val = (r: Row): string | number => {
      switch (sort.key) {
        case "name": return r.name.toLowerCase();
        case "group": return r.group?.code ?? "";
        case "total": return r.total;
        case "last": return r.last?.awardedOn ?? "";
        default: return r.counts[sort.key];
      }
    };
    const list = (onlyMissing ? missing : rows).slice();
    list.sort((a, b) => {
      const va = val(a), vb = val(b);
      const c = va < vb ? -1 : va > vb ? 1 : 0;
      return c * sort.dir || a.name.localeCompare(b.name);
    });
    return list;
  }, [rows, missing, onlyMissing, sort]);

  const max = Math.max(1, ...rows.map((r) => r.total));

  if (!players.length) return null;

  return (
    <section className="mb-8 space-y-4" aria-label="Awards overview">
      {/* Filters: one row above the charts */}
      <div className="flex flex-wrap items-center gap-2">
        <Seg value={groupId} onChange={setGroupId} options={[{ value: "", label: "All groups" }, ...groups.filter((g) => players.some((p) => p.groupId === g.id)).map((g) => ({ value: g.id, label: g.code }))]} />
        {season && <Seg value={scope} onChange={(v) => setScope(v as "season" | "all")} options={[{ value: "season", label: `Season ${season.name}` }, { value: "all", label: "All time" }]} />}
        <label className="flex cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm">
          <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} className="accent-[var(--brand)]" />
          Only players without an award
        </label>
        <div className="ml-auto">
          <Seg
            value={view}
            onChange={(v) => setView(v as "chart" | "table")}
            options={[
              { value: "chart", label: <span className="inline-flex items-center gap-1"><BarChart3 className="size-4" /> Chart</span> },
              { value: "table", label: <span className="inline-flex items-center gap-1"><Table2 className="size-4" /> Table</span> },
            ]}
          />
        </div>
      </div>

      {/* Headline + coverage meters */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs font-medium tracking-wide text-muted uppercase">Players with an award</div>
          <div className="mt-1 text-3xl font-bold tabular-nums">
            {awarded}<span className="text-lg font-semibold text-muted"> / {rows.length}</span>
          </div>
          <div className="mt-0.5 text-xs text-muted">{totalAwards} award{totalAwards === 1 ? "" : "s"} given{scope === "season" && season ? " this season" : ""}</div>
        </Card>
        <Card className="p-4 sm:col-span-1 lg:col-span-3">
          <div className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">Coverage by age group</div>
          <div className="space-y-2">
            {coverageByGroup.map(({ g, n, awarded }) => (
              <div key={g.id} className="flex items-center gap-3 text-sm">
                <span className="w-10 font-semibold">{g.code}</span>
                <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-surface-2" role="meter" aria-valuemin={0} aria-valuemax={n} aria-valuenow={awarded} aria-label={`${g.code}: ${awarded} of ${n} players awarded`}>
                  <motion.div className="h-full rounded-full" style={{ background: "var(--series-1)" }} initial={{ width: 0 }} animate={{ width: `${(awarded / n) * 100}%` }} transition={{ type: "spring", stiffness: 160, damping: 28 }} />
                </div>
                <span className="w-28 text-right text-muted tabular-nums">{awarded} of {n} · {Math.round((awarded / n) * 100)}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {missing.length > 0 && !onlyMissing && (
        <Card className="flex flex-wrap items-center gap-2 p-3 text-sm">
          <span className="inline-flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-300">
            <AlertTriangle className="size-4" /> Not yet awarded ({missing.length}):
          </span>
          {missing.slice(0, 24).map((r) => (
            <Link key={r.id} href={`/awards?player=${r.id}#give`} className="rounded-full bg-surface-2 px-2.5 py-0.5 hover:bg-brand-soft hover:text-brand">
              {r.name}
            </Link>
          ))}
          {missing.length > 24 && <button className="text-muted underline" onClick={() => setOnlyMissing(true)}>+{missing.length - 24} more</button>}
        </Card>
      )}

      <Card className="p-4">
        <AnimatePresence mode="wait" initial={false}>
          {view === "chart" ? (
            <motion.div key="chart" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">Awards per player</h3>
                <Legend />
              </div>
              <StackedBars rows={sorted} max={max} />
            </motion.div>
          ) : (
            <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AwardsTable rows={sorted} sort={sort} onSort={(key) => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === "name" || key === "group" ? 1 : -1 }))} />
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </section>
  );
}

function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Legend">
      {AWARD_TYPES.map((t) => (
        <li key={t.value} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: t.colour }} />
          {t.label}
        </li>
      ))}
    </ul>
  );
}

function StackedBars({ rows, max }: { rows: Row[]; max: number }) {
  const [tip, setTip] = useState<{ x: number; y: number; row: Row; type: (typeof AWARD_TYPES)[number] } | null>(null);
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted">Everyone in this view has an award. 🎉</p>;
  return (
    <div className="max-h-[28rem] overflow-y-auto pr-1" onMouseLeave={() => setTip(null)} onScroll={() => setTip(null)}>
      <ul className="space-y-1.5">
        {rows.map((r, i) => (
          <li key={r.id} className="grid grid-cols-[minmax(5rem,10rem)_1fr_1.5rem] sm:grid-cols-[minmax(6rem,10rem)_1fr_2rem] items-center gap-3 text-sm">
            <Link href={`/players/${r.id}`} className="truncate text-text hover:text-brand" title={r.name}>
              {r.name}
              {r.group && <span className="ml-1.5 text-xs text-muted">{r.group.code}</span>}
            </Link>
            {r.total === 0 ? (
              <Link href={`/awards?player=${r.id}#give`} className="flex h-5 items-center overflow-hidden rounded border border-dashed border-border px-2 text-xs whitespace-nowrap text-muted hover:border-brand hover:text-brand">
                <span className="sm:hidden">None yet →</span>
                <span className="hidden sm:inline">No awards yet: give one →</span>
              </Link>
            ) : (
              <div className="flex h-5 gap-[2px]" style={{ width: `${(r.total / max) * 100}%` }}>
                {AWARD_TYPES.filter((t) => r.counts[t.value] > 0).map((t, j, arr) => (
                  <motion.div
                    key={t.value}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: Math.min(i, 12) * 0.025, type: "spring", stiffness: 200, damping: 30 }}
                    style={{ flexGrow: r.counts[t.value], flexBasis: 0, background: t.colour, originX: 0 }}
                    className={cn("h-full min-w-[3px] cursor-default", j === arr.length - 1 && "rounded-r-[4px]")}
                    onMouseMove={(e) => setTip({ x: e.clientX, y: e.clientY, row: r, type: t })}
                    onMouseLeave={() => setTip(null)}
                    aria-label={`${r.name}: ${r.counts[t.value]} ${t.label}`}
                  />
                ))}
              </div>
            )}
            <span className="text-right font-semibold tabular-nums">{r.total || ""}</span>
          </li>
        ))}
      </ul>
      {tip && <Tooltip x={tip.x} y={tip.y} row={tip.row} active={tip.type.value} />}
    </div>
  );
}

/** Rendered into <body> with fixed positioning so the chart's scroll box can't clip it; flips near viewport edges. */
function Tooltip({ x, y, row, active }: { x: number; y: number; row: Row; active: AwardType }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x + 14, top: y + 14 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const left = x + 14 + width > window.innerWidth - 8 ? x - 14 - width : x + 14;
    const top = y + 14 + height > window.innerHeight - 8 ? y - 14 - height : y + 14;
    setPos({ left: Math.max(8, left), top: Math.max(8, top) });
  }, [x, y]);
  return createPortal(
    <div
      ref={ref}
      role="tooltip"
      className="pointer-events-none fixed z-[100] rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text shadow-xl"
      style={pos}
    >
      <div className="font-semibold">{row.name}</div>
      {AWARD_TYPES.filter((t) => row.counts[t.value] > 0).map((t) => (
        <div key={t.value} className={cn("flex items-center gap-1.5", t.value === active ? "text-text" : "text-muted")}>
          <span className="size-2 rounded-sm" style={{ background: t.colour }} /> {t.label}: <span className="font-semibold tabular-nums">{row.counts[t.value]}</span>
        </div>
      ))}
      {row.last && <div className="mt-1 text-muted">Last: {row.last.title}, {fmtDate(row.last.awardedOn, { day: "numeric", month: "short" })}</div>}
    </div>,
    document.body,
  );
}

function AwardsTable({ rows, sort, onSort }: { rows: Row[]; sort: { key: SortKey; dir: 1 | -1 }; onSort: (k: SortKey) => void }) {
  const Th = ({ k, children, right }: { k: SortKey; children: React.ReactNode; right?: boolean }) => (
    <th className={cn("p-2 font-medium whitespace-nowrap", right ? "text-right" : "text-left")} aria-sort={sort.key === k ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button onClick={() => onSort(k)} className={cn("inline-flex items-center gap-1 hover:text-text", sort.key === k ? "text-text" : "text-muted")}>
        {children}
        {sort.key === k && (sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
      </button>
    </th>
  );
  return (
    <div className="max-h-[28rem] overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-surface">
          <tr className="border-b border-border">
            <Th k="name">Player</Th>
            <Th k="group">Group</Th>
            {AWARD_TYPES.map((t) => (
              <Th key={t.value} k={t.value} right>
                <span className="size-2 rounded-sm" style={{ background: t.colour }} /> {t.short}
              </Th>
            ))}
            <Th k="total" right>Total</Th>
            <Th k="last">Last award</Th>
            <th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={cn("border-b border-border/60 hover:bg-surface-2", r.total === 0 && "bg-amber-500/5")}>
              <td className="p-2"><Link href={`/players/${r.id}`} className="font-medium hover:text-brand">{r.name}</Link></td>
              <td className="p-2 text-muted">{r.group?.code ?? "–"}</td>
              {AWARD_TYPES.map((t) => (
                <td key={t.value} className={cn("p-2 text-right tabular-nums", r.counts[t.value] ? "" : "text-muted/50")}>{r.counts[t.value] || "·"}</td>
              ))}
              <td className="p-2 text-right font-semibold tabular-nums">{r.total}</td>
              <td className="p-2 whitespace-nowrap text-muted">
                {r.last ? (
                  <>{r.last.title} · {fmtDate(r.last.awardedOn, { day: "numeric", month: "short" })}</>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300"><AlertTriangle className="size-3.5" /> Not yet awarded</span>
                )}
              </td>
              <td className="p-2 text-right">
                <Link href={`/awards?player=${r.id}#give`} className="text-xs whitespace-nowrap text-brand hover:underline">Give award</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="py-6 text-center text-sm text-muted">Everyone in this view has an award. 🎉</p>}
    </div>
  );
}

function Seg<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode }[] }) {
  return (
    <div className="inline-flex rounded-full border border-border bg-surface p-0.5 text-sm" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("relative rounded-full px-3 py-1 font-medium transition", value === o.value ? "text-brand-fg" : "text-muted hover:text-text")}
        >
          {value === o.value && <motion.span layoutId={`seg-${options.map((x) => x.value).join("")}`} className="absolute inset-0 rounded-full bg-brand" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
