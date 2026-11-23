import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

/** Local-disk media store. Files are never served statically; see /api/media/[...key]. */
const ROOT = path.resolve(/*turbopackIgnore: true*/ process.env.MEDIA_DIR ?? "./data/media");

const KEY_RE = /^[a-z]+\/[a-zA-Z0-9-]+\.[a-z0-9]{1,5}$/;

function resolveKey(key: string) {
  if (!KEY_RE.test(key)) throw new Error("Invalid media key");
  const full = path.join(/*turbopackIgnore: true*/ ROOT, key);
  if (!full.startsWith(ROOT + path.sep)) throw new Error("Invalid media key");
  return full;
}

export const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "application/pdf": "pdf",
};

const MIME_BY_EXT = Object.fromEntries(Object.entries(ALLOWED_MIME).map(([m, e]) => [e, m]));

export async function saveUpload(prefix: "players" | "drills", file: File, maxBytes: number) {
  const ext = ALLOWED_MIME[file.type];
  if (!ext) throw new Error(`Unsupported file type: ${file.type || "unknown"}`);
  if (file.size > maxBytes) throw new Error(`File too large (max ${Math.round(maxBytes / 1024 / 1024)} MB)`);
  const key = `${prefix}/${randomUUID()}.${ext}`;
  const full = resolveKey(key);
  await mkdir(/*turbopackIgnore: true*/ path.dirname(full), { recursive: true });
  await writeFile(/*turbopackIgnore: true*/ full, Buffer.from(await file.arrayBuffer()));
  return { key, mime: file.type };
}

export async function readMedia(key: string) {
  const full = resolveKey(key);
  const [buf, st] = await Promise.all([readFile(/*turbopackIgnore: true*/ full), stat(/*turbopackIgnore: true*/ full)]);
  const ext = key.split(".").pop()!;
  return { buf, size: st.size, mime: MIME_BY_EXT[ext] ?? "application/octet-stream" };
}

export async function deleteMedia(key: string | null | undefined) {
  if (!key) return;
  await rm(/*turbopackIgnore: true*/ resolveKey(key), { force: true });
}
