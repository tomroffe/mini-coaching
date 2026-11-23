import type { Arrow, Diagram, Entity, EntityKind, Point, Step, TeamColour } from "../../lib/diagram";

/**
 * Small DSL for authoring animated drill diagrams in seed data.
 *   ents: [id, kind, x, y, team?, label?]
 *   step.run:   { A: [x, y, curve?] }  → arrow from A's previous spot, A moves there
 *   step.move:  { A: [x, y] }          → silent reposition
 *   step.pass:  [from, to]             → dashed pass arrow; ball (step.ball or "ball") jumps to receiver
 *   step.carry: { ballId: holderId }   → ball sits in the holder's hands
 */
type EntSpec = [string, EntityKind, number, number, TeamColour?, string?];
type StepSpec = {
  caption: string;
  run?: Record<string, [number, number, number?]>;
  move?: Record<string, [number, number]>;
  pass?: [string, string, string?][]; // [from, to, ballId?]
  carry?: Record<string, string>;
  hide?: string[];
  show?: string[];
  callouts?: [number, number, string][];
};

const BALL_OFFSET = { x: 0.45, y: 0.35 };

export function diagram(
  pitch: Diagram["pitch"],
  ents: EntSpec[],
  steps: StepSpec[],
  initialCarry: Record<string, string> = {},
): Diagram {
  const entities: Entity[] = ents.map(([id, kind, , , team, label]) => ({ id, kind, team, label }));
  const pos: Record<string, Point> = Object.fromEntries(ents.map(([id, , x, y]) => [id, { x, y }]));
  let hidden = new Set<string>();
  const carrying: Record<string, string> = { ...initialCarry };
  const placeBalls = () => {
    for (const [ball, holder] of Object.entries(carrying)) {
      const h = pos[holder];
      if (h) pos[ball] = { x: h.x + BALL_OFFSET.x, y: h.y + BALL_OFFSET.y };
    }
  };
  placeBalls();

  const out: Step[] = [];
  steps.forEach((s, i) => {
    const arrows: Arrow[] = [];
    if (i === 0) {
      // set-up step: everything at initial positions
    }
    for (const [id, [x, y, curve]] of Object.entries(s.run ?? {})) {
      arrows.push({ from: { ...pos[id] }, to: { x, y }, kind: "run", curve: curve ?? 0 });
      pos[id] = { x, y };
    }
    for (const [id, [x, y]] of Object.entries(s.move ?? {})) pos[id] = { x, y };
    if (s.carry) Object.assign(carrying, s.carry);
    for (const [ball, holder] of Object.entries(s.carry ?? {})) if (!holder) delete carrying[ball];
    placeBalls();
    for (const [from, to, ballId = "ball"] of s.pass ?? []) {
      arrows.push({ from: { ...pos[from] }, to: { ...pos[to] }, kind: "pass", curve: 0 });
      carrying[ballId] = to;
    }
    placeBalls();
    if (s.hide) hidden = new Set([...hidden, ...s.hide]);
    if (s.show) s.show.forEach((id) => hidden.delete(id));
    out.push({
      caption: s.caption,
      positions: i === 0 ? clone(pos) : clone(pos),
      hidden: [...hidden],
      arrows,
      callouts: (s.callouts ?? []).map(([x, y, text]) => ({ x, y, text })),
    });
  });
  return { pitch, entities, steps: out };
}

const clone = (p: Record<string, Point>) => JSON.parse(JSON.stringify(p)) as Record<string, Point>;

/** Four corner cones for a w × h grid. */
export const corners = (w: number, h: number): EntSpec[] => [
  ["c1", "cone", 0, 0],
  ["c2", "cone", w, 0],
  ["c3", "cone", 0, h],
  ["c4", "cone", w, h],
];
