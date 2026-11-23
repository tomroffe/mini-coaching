import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** "2026-11-29" -> "Sun 29 Nov" */
export function fmtDate(d: string | Date, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) {
  const date = typeof d === "string" ? new Date(d + "T12:00:00") : d;
  return date.toLocaleDateString("en-GB", opts);
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Add minutes to "HH:MM" */
export function addMinutes(hhmm: string, mins: number) {
  const [h, m] = hhmm.split(":").map(Number);
  const t = h * 60 + m + mins;
  return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

export function initials(first: string, last = "") {
  return (first[0] ?? "").toUpperCase() + (last[0] ?? "").toUpperCase();
}

export const lines = (s: FormDataEntryValue | null) =>
  String(s ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

export const csv = (s: FormDataEntryValue | null) =>
  String(s ?? "")
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean);

/** Extract a YouTube/Vimeo embed URL from a pasted link. */
export function videoEmbed(url: string): { type: "youtube" | "vimeo"; embed: string } | null {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return { type: "youtube", embed: `https://www.youtube-nocookie.com/embed/${yt[1]}` };
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return { type: "vimeo", embed: `https://player.vimeo.com/video/${vm[1]}` };
  return null;
}
