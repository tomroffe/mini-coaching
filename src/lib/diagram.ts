import { z } from "zod";

/**
 * Drill diagram model. All coordinates are in metres, origin top-left of the pitch.
 * A diagram is a set of entities plus an ordered list of steps; each step says where
 * entities are and which movement / pass arrows to draw. The viewer animates between steps.
 */

export const ENTITY_KINDS = ["attacker", "defender", "coach", "ball", "cone", "tag"] as const;
export const TEAM_COLOURS = ["teal", "coral", "purple", "blue", "gold", "grey"] as const;

export const pointSchema = z.object({ x: z.number(), y: z.number() });

export const entitySchema = z.object({
  id: z.string().min(1),
  kind: z.enum(ENTITY_KINDS),
  team: z.enum(TEAM_COLOURS).optional(),
  label: z.string().max(4).optional(),
});

export const arrowSchema = z.object({
  from: pointSchema,
  to: pointSchema,
  kind: z.enum(["run", "pass"]),
  /** perpendicular bend in metres; 0 = straight */
  curve: z.number().default(0),
});

export const zoneSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  label: z.string().optional(),
  fill: z.enum(["water", "endzone", "nest", "grid"]).default("grid"),
});

export const lineSchema = z.object({
  x1: z.number(),
  y1: z.number(),
  x2: z.number(),
  y2: z.number(),
  label: z.string().optional(),
});

export const stepSchema = z.object({
  caption: z.string().default(""),
  positions: z.record(z.string(), pointSchema).default({}),
  hidden: z.array(z.string()).default([]),
  arrows: z.array(arrowSchema).default([]),
  /** text call-outs, e.g. "TAG!" or "Try!" */
  callouts: z.array(z.object({ x: z.number(), y: z.number(), text: z.string() })).default([]),
});

export const diagramSchema = z.object({
  pitch: z.object({
    w: z.number().positive(),
    h: z.number().positive(),
    zones: z.array(zoneSchema).default([]),
    lines: z.array(lineSchema).default([]),
    gridEvery: z.number().positive().optional(),
  }),
  entities: z.array(entitySchema),
  steps: z.array(stepSchema).min(1),
});

export type Point = z.infer<typeof pointSchema>;
export type Entity = z.infer<typeof entitySchema>;
export type Arrow = z.infer<typeof arrowSchema>;
export type Step = z.infer<typeof stepSchema>;
export type Diagram = z.infer<typeof diagramSchema>;
export type EntityKind = (typeof ENTITY_KINDS)[number];
export type TeamColour = (typeof TEAM_COLOURS)[number];

/** Resolve where every entity sits at a given step, carrying forward earlier positions. */
export function resolvePositions(d: Diagram, stepIndex: number): Record<string, Point> {
  const out: Record<string, Point> = {};
  for (let i = 0; i <= Math.min(stepIndex, d.steps.length - 1); i++) {
    Object.assign(out, d.steps[i].positions);
  }
  return out;
}

export function emptyDiagram(w = 15, h = 10): Diagram {
  return {
    pitch: { w, h, zones: [], lines: [] },
    entities: [],
    steps: [{ caption: "Set-up", positions: {}, hidden: [], arrows: [], callouts: [] }],
  };
}

/** SVG path for an arrow (quadratic bend when curve != 0). */
export function arrowPath(a: Arrow, scale = 1): string {
  const x1 = a.from.x * scale, y1 = a.from.y * scale, x2 = a.to.x * scale, y2 = a.to.y * scale;
  if (!a.curve) return `M ${x1} ${y1} L ${x2} ${y2}`;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const cx = mx + (-dy / len) * a.curve * scale;
  const cy = my + (dx / len) * a.curve * scale;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}
