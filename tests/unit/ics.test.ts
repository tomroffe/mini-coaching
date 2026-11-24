import { describe, expect, it } from "vitest";
import { buildIcs, escapeText, foldLine } from "@/lib/ics";

describe("escapeText", () => {
  it("escapes backslash, semicolon, comma and newlines", () => {
    expect(escapeText("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne");
  });
});

describe("foldLine", () => {
  it("leaves short lines alone", () => {
    expect(foldLine("SUMMARY:short")).toBe("SUMMARY:short");
  });
  it("folds at 75 octets with a leading-space continuation", () => {
    const folded = foldLine("DESCRIPTION:" + "x".repeat(200));
    const parts = folded.split("\r\n");
    expect(parts.length).toBeGreaterThan(2);
    for (const p of parts) expect(new TextEncoder().encode(p).length).toBeLessThanOrEqual(75);
    expect(parts.slice(1).every((p) => p.startsWith(" "))).toBe(true);
    expect(parts.map((p, i) => (i ? p.slice(1) : p)).join("")).toBe("DESCRIPTION:" + "x".repeat(200));
  });
  it("never splits a multi-byte character", () => {
    const folded = foldLine("SUMMARY:" + "✅".repeat(40));
    for (const p of folded.split("\r\n")) expect(() => decodeURIComponent(encodeURIComponent(p))).not.toThrow();
    expect(folded.split("\r\n").map((p, i) => (i ? p.slice(1) : p)).join("")).toBe("SUMMARY:" + "✅".repeat(40));
  });
});

describe("buildIcs", () => {
  const ics = buildIcs({
    name: "Minis Coach: U6",
    now: new Date("2026-11-24T10:00:00Z"),
    events: [
      { uid: "week-1@minis-coach", date: "2026-11-29", start: "09:30", end: "10:15", summary: "✅ U6 training", description: "Plan: Ball confidence\nTap: https://x/y", url: "https://x/p" },
      { uid: "week-2@minis-coach", date: "2026-12-06", start: "09:30", end: "10:15", summary: "Cancelled: U6 training", status: "CANCELLED" },
    ],
  });
  it("is a CRLF calendar with a London VTIMEZONE", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("TZID:Europe/London");
    expect(ics).toContain("REFRESH-INTERVAL;VALUE=DURATION:PT1H");
  });
  it("emits local times with TZID and stable UIDs", () => {
    expect(ics).toContain("DTSTART;TZID=Europe/London:20261129T093000");
    expect(ics).toContain("DTEND;TZID=Europe/London:20261129T101500");
    expect(ics).toContain("UID:week-1@minis-coach");
    expect(ics).toContain("DTSTAMP:20261124T100000Z");
  });
  it("marks cancelled sessions", () => {
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain("STATUS:CANCELLED");
    expect(ics).toContain("STATUS:CONFIRMED");
  });
  it("escapes description newlines", () => {
    expect(ics.replace(/\r\n /g, "")).toContain("DESCRIPTION:Plan: Ball confidence\\nTap: https://x/y");
  });
});
