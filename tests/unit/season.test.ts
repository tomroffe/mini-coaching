import { describe, expect, it } from "vitest";
import { cancelAndShift, weekdaysBetween, type WeekLite } from "@/lib/season";

const w = (id: string, date: string, planId: string | null, status: WeekLite["status"] = "training"): WeekLite => ({ id, date, planId, status });

describe("cancelAndShift", () => {
  const weeks = [w("1", "2027-01-03", "A"), w("2", "2027-01-10", "B"), w("3", "2027-01-17", "C"), w("4", "2027-01-24", null, "festival"), w("5", "2027-01-31", "D")];

  it("moves the cancelled plan and all later plans forward one training week", () => {
    const { updates, dropped } = cancelAndShift(weeks, "2");
    const byId = Object.fromEntries(updates.map((u) => [u.id, u]));
    expect(byId["2"]).toEqual({ id: "2", status: "cancelled", planId: null });
    expect(byId["3"].planId).toBe("B");
    expect(byId["5"].planId).toBe("C"); // festival week is skipped
    expect(byId["4"]).toBeUndefined();
    expect(dropped).toEqual(["D"]);
  });

  it("does not touch earlier weeks", () => {
    const { updates } = cancelAndShift(weeks, "3");
    expect(updates.find((u) => u.id === "1" || u.id === "2")).toBeUndefined();
  });

  it("handles cancelling the last week", () => {
    const { updates, dropped } = cancelAndShift(weeks, "5");
    expect(updates).toEqual([{ id: "5", status: "cancelled", planId: null }]);
    expect(dropped).toEqual(["D"]);
  });

  it("is a no-op for unknown ids", () => {
    expect(cancelAndShift(weeks, "nope")).toEqual({ updates: [], dropped: [] });
  });
});

describe("weekdaysBetween", () => {
  it("lists every Sunday inclusive", () => {
    const s = weekdaysBetween("2026-11-29", "2027-05-02", 0);
    expect(s[0]).toBe("2026-11-29");
    expect(s.at(-1)).toBe("2027-05-02");
    expect(s).toHaveLength(23); // matches the U6 plan's 23 sessions
  });
  it("starts on the first matching weekday", () => {
    expect(weekdaysBetween("2026-11-24", "2026-12-10", 0)).toEqual(["2026-11-29", "2026-12-06"]);
  });
});
