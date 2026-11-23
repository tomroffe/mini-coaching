import { describe, expect, it } from "vitest";
import { DRILLS } from "@/db/seed/drills";
import { U6_PLANS } from "@/db/seed/plans";
import { diagramSchema, resolvePositions } from "@/lib/diagram";

describe("seeded drill diagrams", () => {
  it.each(DRILLS.map((d) => [d.slug, d] as const))("%s is a valid diagram", (_, d) => {
    const parsed = diagramSchema.parse(d.diagram);
    expect(parsed.steps.length).toBeGreaterThanOrEqual(3);
    // every entity has a position by the set-up step, and stays roughly on the pitch
    const pos = resolvePositions(parsed, 0);
    for (const e of parsed.entities) {
      expect(pos[e.id], `${d.slug}: ${e.id}`).toBeDefined();
      for (let i = 0; i < parsed.steps.length; i++) {
        const p = resolvePositions(parsed, i)[e.id];
        expect(p.x).toBeGreaterThanOrEqual(-1);
        expect(p.x).toBeLessThanOrEqual(parsed.pitch.w + 1);
        expect(p.y).toBeGreaterThanOrEqual(-1);
        expect(p.y).toBeLessThanOrEqual(parsed.pitch.h + 1);
      }
    }
  });

  it("has unique slugs", () => {
    expect(new Set(DRILLS.map((d) => d.slug)).size).toBe(DRILLS.length);
  });
});

describe("U6 season plan", () => {
  it("has 23 Sunday sessions from 29 Nov 2026 to 2 May 2027", () => {
    expect(U6_PLANS).toHaveLength(23);
    expect(U6_PLANS[0].date).toBe("2026-11-29");
    expect(U6_PLANS.at(-1)!.date).toBe("2027-05-02");
    for (const p of U6_PLANS) expect(new Date(p.date + "T12:00Z").getUTCDay()).toBe(0);
  });
  it("only references drills that exist", () => {
    const slugs = new Set(DRILLS.map((d) => d.slug));
    for (const p of U6_PLANS) for (const s of [p.skill1, p.skill2, p.finish]) expect(slugs.has(s), `${p.n}: ${s}`).toBe(true);
  });
});
