/**
 * Minimal RFC 5545 (iCalendar) builder for subscription feeds. No dependencies, pure (unit-tested).
 * Times are local wall-clock times in Europe/London, emitted with TZID + a VTIMEZONE block.
 */

export type IcsEvent = {
  uid: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:MM
  end: string; // HH:MM
  summary: string;
  description?: string;
  url?: string;
  status?: "CONFIRMED" | "CANCELLED";
  location?: string;
};

export type IcsCalendar = { name: string; description?: string; events: IcsEvent[]; now?: Date };

const TZID = "Europe/London";

/** RFC 5545 §3.3.11: escape backslash, semicolon, comma and newlines in TEXT values. */
export function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** RFC 5545 §3.1: fold lines longer than 75 octets (UTF-8), continuation lines start with a space. */
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  let curBytes = 0;
  let limit = 75;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (curBytes + b > limit) {
      out.push(cur);
      cur = "";
      curBytes = 0;
      limit = 74; // continuation lines carry a leading space
    }
    cur += ch;
    curBytes += b;
  }
  out.push(cur);
  return out.join("\r\n ");
}

const localStamp = (date: string, hhmm: string) => `${date.replace(/-/g, "")}T${hhmm.replace(":", "")}00`;

function utcStamp(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

const VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  `TZID:${TZID}`,
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:+0000",
  "TZOFFSETTO:+0100",
  "TZNAME:BST",
  "DTSTART:19700329T010000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:+0100",
  "TZOFFSETTO:+0000",
  "TZNAME:GMT",
  "DTSTART:19701025T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

export function buildIcs(cal: IcsCalendar): string {
  const stamp = utcStamp(cal.now ?? new Date());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Minis Coach//Season feed//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(cal.name)}`,
    `X-WR-TIMEZONE:${TZID}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
    ...(cal.description ? [`X-WR-CALDESC:${escapeText(cal.description)}`] : []),
    ...VTIMEZONE,
  ];
  for (const e of cal.events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=${TZID}:${localStamp(e.date, e.start)}`,
      `DTEND;TZID=${TZID}:${localStamp(e.date, e.end)}`,
      `SUMMARY:${escapeText(e.summary)}`,
      `STATUS:${e.status ?? "CONFIRMED"}`,
      "TRANSP:OPAQUE",
    );
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
    if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`);
    if (e.url) lines.push(`URL:${e.url}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
