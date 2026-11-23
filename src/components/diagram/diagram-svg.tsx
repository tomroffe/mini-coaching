"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useId, type PointerEvent as ReactPointerEvent } from "react";
import { arrowPath, resolvePositions, type Diagram, type Entity, type Point, type TeamColour } from "@/lib/diagram";

export const PX = 40; // px per metre
export const PAD = 1.4; // metres of margin around the pitch

export const TEAM_HEX: Record<TeamColour, string> = {
  teal: "#14b8a6",
  coral: "#f05a3c",
  purple: "#8b5cf6",
  blue: "#3b82f6",
  gold: "#eab308",
  grey: "#6b7280",
};

export type DiagramSvgProps = {
  diagram: Diagram;
  step: number;
  /** animate movement between steps (off for static thumbnails / print) */
  animate?: boolean;
  speed?: number;
  className?: string;
  /** editor hooks */
  selectedId?: string | null;
  onEntityPointerDown?: (e: ReactPointerEvent, id: string) => void;
  onBackgroundPointerDown?: (e: ReactPointerEvent<SVGSVGElement>, p: Point) => void;
  svgRef?: React.Ref<SVGSVGElement>;
  showArrowHandles?: boolean;
  onArrowClick?: (index: number) => void;
};

export function DiagramSvg({
  diagram,
  step,
  animate = true,
  speed = 1,
  className,
  selectedId,
  onEntityPointerDown,
  onBackgroundPointerDown,
  svgRef,
  onArrowClick,
}: DiagramSvgProps) {
  const uid = useId().replace(/:/g, "");
  const { pitch } = diagram;
  const s = diagram.steps[Math.min(step, diagram.steps.length - 1)];
  const pos = resolvePositions(diagram, step);
  const hidden = new Set(s?.hidden ?? []);
  const W = (pitch.w + PAD * 2) * PX;
  const H = (pitch.h + PAD * 2) * PX;
  const dur = 1.0 / speed;

  const order: Record<Entity["kind"], number> = { cone: 0, tag: 1, coach: 2, defender: 3, attacker: 3, ball: 4 };
  const ents = [...diagram.entities].sort((a, b) => order[a.kind] - order[b.kind]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      role="img"
      aria-label={s?.caption || "Drill diagram"}
      style={{ touchAction: onEntityPointerDown ? "none" : undefined }}
      onPointerDown={(e) => {
        if (!onBackgroundPointerDown) return;
        const svg = e.currentTarget;
        const pt = svgPoint(svg, e.clientX, e.clientY);
        onBackgroundPointerDown(e, pt);
      }}
    >
      <defs>
        <pattern id={`grass-${uid}`} width={PX * 2} height={H} patternUnits="userSpaceOnUse">
          <rect width={PX} height={H} fill="var(--pitch)" />
          <rect x={PX} width={PX} height={H} fill="var(--pitch-dark)" />
        </pattern>
        <pattern id={`hatch-${uid}`} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="10" height="10" fill="rgba(255,255,255,0.12)" />
          <line x1="0" y1="0" x2="0" y2="10" stroke="rgba(255,255,255,0.22)" strokeWidth="3" />
        </pattern>
        <pattern id={`water-${uid}`} width="40" height="16" patternUnits="userSpaceOnUse">
          <rect width="40" height="16" fill="#5fa8d3" />
          <path d="M0 8 Q10 3 20 8 T40 8" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
        </pattern>
        <marker id={`run-${uid}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#fff" />
        </marker>
        <marker id={`pass-${uid}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="var(--accent)" />
        </marker>
        <filter id={`shadow-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* surround */}
      <rect width={W} height={H} rx={18} fill="var(--pitch-dark)" />
      <g transform={`translate(${PAD * PX} ${PAD * PX})`}>
        {/* pitch */}
        <rect width={pitch.w * PX} height={pitch.h * PX} fill={`url(#grass-${uid})`} />
        {pitch.gridEvery &&
          Array.from({ length: Math.floor(pitch.w / pitch.gridEvery) - 0 }, (_, i) => (i + 1) * pitch.gridEvery!)
            .filter((x) => x < pitch.w)
            .map((x) => <line key={`gx${x}`} x1={x * PX} y1={0} x2={x * PX} y2={pitch.h * PX} stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} />)}
        {pitch.gridEvery &&
          Array.from({ length: Math.floor(pitch.h / pitch.gridEvery) }, (_, i) => (i + 1) * pitch.gridEvery!)
            .filter((y) => y < pitch.h)
            .map((y) => <line key={`gy${y}`} x1={0} y1={y * PX} x2={pitch.w * PX} y2={y * PX} stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} />)}

        {pitch.zones.map((z, i) => (
          <g key={`z${i}`}>
            <rect
              x={z.x * PX}
              y={z.y * PX}
              width={z.w * PX}
              height={z.h * PX}
              rx={z.fill === "nest" ? 10 : 0}
              fill={z.fill === "water" ? `url(#water-${uid})` : z.fill === "endzone" ? `url(#hatch-${uid})` : z.fill === "nest" ? "rgba(255,255,255,0.10)" : "transparent"}
              stroke={z.fill === "nest" ? "rgba(255,255,255,0.7)" : z.fill === "grid" ? "rgba(255,255,255,0.35)" : "none"}
              strokeDasharray={z.fill === "nest" ? "6 5" : undefined}
              strokeWidth={2}
            />
            {z.label && (
              <text x={(z.x + z.w / 2) * PX} y={z.y * PX + 18} textAnchor="middle" fontSize={14} fontWeight={700} fill="rgba(255,255,255,0.85)" style={{ letterSpacing: 1 }}>
                {z.label.toUpperCase()}
              </text>
            )}
          </g>
        ))}

        <rect width={pitch.w * PX} height={pitch.h * PX} fill="none" stroke="var(--pitch-line)" strokeWidth={3} />

        {pitch.lines.map((l, i) => (
          <g key={`l${i}`}>
            <line x1={l.x1 * PX} y1={l.y1 * PX} x2={l.x2 * PX} y2={l.y2 * PX} stroke="var(--pitch-line)" strokeWidth={2.5} strokeDasharray="10 7" />
            {l.label && (
              <text x={l.x2 * PX} y={l.y2 * PX + 22} textAnchor="middle" fontSize={13} fontWeight={700} fill="#fff">
                {l.label}
              </text>
            )}
          </g>
        ))}

        {/* arrows for the current step */}
        <AnimatePresence>
          {s?.arrows.map((a, i) => (
            <motion.path
              key={`${step}-a${i}`}
              d={arrowPath(a, PX)}
              fill="none"
              stroke={a.kind === "pass" ? "var(--accent)" : "#fff"}
              strokeWidth={a.kind === "pass" ? 3 : 3.2}
              strokeDasharray={a.kind === "pass" ? "9 7" : undefined}
              strokeLinecap="round"
              markerEnd={`url(#${a.kind}-${uid})`}
              opacity={0.95}
              initial={animate ? { pathLength: 0, opacity: 0 } : false}
              animate={{ pathLength: 1, opacity: 0.95 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={{ duration: 0.7 / speed, ease: "easeOut" }}
              onClick={onArrowClick ? () => onArrowClick(i) : undefined}
              style={{ cursor: onArrowClick ? "pointer" : undefined }}
            />
          ))}
        </AnimatePresence>

        {/* entities */}
        {ents.map((e) => {
          const p = pos[e.id];
          if (!p) return null;
          const isHidden = hidden.has(e.id);
          return (
            <motion.g
              key={e.id}
              initial={false}
              animate={{ x: p.x * PX, y: p.y * PX, opacity: isHidden ? 0 : 1, scale: isHidden ? 0.4 : 1 }}
              transition={animate ? { duration: dur, ease: [0.4, 0, 0.2, 1], opacity: { duration: 0.3 }, scale: { duration: 0.3 } } : { duration: 0 }}
              style={{ cursor: onEntityPointerDown ? "grab" : undefined, pointerEvents: isHidden && !onEntityPointerDown ? "none" : undefined }}
              onPointerDown={onEntityPointerDown ? (ev) => { ev.stopPropagation(); onEntityPointerDown(ev, e.id); } : undefined}
            >
              <EntityGlyph e={e} uid={uid} selected={selectedId === e.id} ghost={isHidden} />
            </motion.g>
          );
        })}

        {/* callouts */}
        <AnimatePresence>
          {s?.callouts.map((c, i) => (
            <motion.g
              key={`${step}-c${i}`}
              initial={animate ? { scale: 0, opacity: 0 } : false}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 18, delay: animate ? 0.45 / speed : 0 }}
              style={{ originX: `${c.x * PX}px`, originY: `${c.y * PX}px` }}
            >
              <Callout x={c.x * PX} y={c.y * PX} text={c.text} />
            </motion.g>
          ))}
        </AnimatePresence>
      </g>
    </svg>
  );
}

function Callout({ x, y, text }: { x: number; y: number; text: string }) {
  const w = Math.max(44, text.length * 10 + 18);
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-w / 2} y={-15} width={w} height={28} rx={14} fill="#fff" />
      <path d="M -6 12 L 0 20 L 6 12 z" fill="#fff" />
      <text y={5} textAnchor="middle" fontSize={15} fontWeight={800} fill="#15201b">
        {text}
      </text>
    </g>
  );
}

export function EntityGlyph({ e, uid, selected, ghost }: { e: Pick<Entity, "kind" | "team" | "label">; uid?: string; selected?: boolean; ghost?: boolean }) {
  const ring = selected ? <circle r={22} fill="none" stroke="var(--accent)" strokeWidth={3} strokeDasharray="5 4" /> : null;
  const op = ghost ? 0.35 : 1;
  switch (e.kind) {
    case "attacker":
    case "defender": {
      const fill = TEAM_HEX[e.team ?? (e.kind === "attacker" ? "teal" : "coral")];
      return (
        <g opacity={op} filter={uid ? `url(#shadow-${uid})` : undefined}>
          {ring}
          <circle r={15} fill={fill} stroke="#fff" strokeWidth={3} />
          {e.kind === "defender" && <circle r={15} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={1} />}
          {e.label && (
            <text y={5} textAnchor="middle" fontSize={14} fontWeight={800} fill="#fff">
              {e.label}
            </text>
          )}
        </g>
      );
    }
    case "coach":
      return (
        <g opacity={op}>
          {ring}
          <circle r={15} fill="#4b5563" stroke="#fff" strokeWidth={3} />
          <text y={5} textAnchor="middle" fontSize={13} fontWeight={800} fill="#fff">
            {e.label || "C"}
          </text>
        </g>
      );
    case "ball":
      return (
        <g opacity={op}>
          {ring}
          <ellipse rx={9} ry={6} fill="#f59e0b" stroke="#7c4a03" strokeWidth={1.5} transform="rotate(-20)" />
          <path d="M -4 1.5 L 4 -1.5" stroke="#fff" strokeWidth={1.2} transform="rotate(-20)" />
        </g>
      );
    case "cone":
      return (
        <g opacity={op}>
          {ring}
          <path d="M 0 -10 L 9 7 L -9 7 Z" fill="#f97316" stroke="#9a3412" strokeWidth={1.5} strokeLinejoin="round" />
        </g>
      );
    case "tag":
      return (
        <g opacity={op}>
          {ring}
          <rect x={-3.5} y={-9} width={7} height={18} rx={2} fill="#ec4899" stroke="#fff" strokeWidth={1.5} />
        </g>
      );
  }
}

/** Convert client coords to pitch metres. */
export function svgPoint(svg: SVGSVGElement, clientX: number, clientY: number): Point {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const m = svg.getScreenCTM();
  if (!m) return { x: 0, y: 0 };
  const p = pt.matrixTransform(m.inverse());
  return { x: p.x / PX - PAD, y: p.y / PX - PAD };
}
