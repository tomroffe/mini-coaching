import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { canSeePhoto, getAccess, isStaff } from "@/lib/authz";
import { readMedia } from "@/lib/storage";

/** Authenticated media: every request is checked; nothing in MEDIA_DIR is public. */
export async function GET(req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const ctx = await getAccess();
  if (!ctx) return new Response("Unauthorised", { status: 401 });
  const key = (await params).key.join("/");

  if (key.startsWith("players/")) {
    const [p] = await db
      .select({ id: schema.players.id, ageGroupId: schema.players.ageGroupId, photoConsent: schema.players.photoConsent })
      .from(schema.players)
      .where(eq(schema.players.photoKey, key));
    if (!p || !canSeePhoto(ctx, p)) return new Response("Not found", { status: 404 });
  } else if (key.startsWith("drills/")) {
    if (!isStaff(ctx)) return new Response("Not found", { status: 404 });
  } else {
    return new Response("Not found", { status: 404 });
  }

  let file;
  try {
    file = await readMedia(key);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const headers = {
    "Content-Type": file.mime,
    "Cache-Control": "private, max-age=3600",
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
  };
  const range = req.headers.get("range");
  const m = range?.match(/bytes=(\d*)-(\d*)/);
  if (m) {
    const start = m[1] ? Number(m[1]) : Math.max(0, file.size - Number(m[2]));
    const end = m[1] && m[2] ? Math.min(Number(m[2]), file.size - 1) : file.size - 1;
    if (start >= file.size || start > end) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${file.size}` } });
    }
    return new Response(file.buf.subarray(start, end + 1), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${file.size}`, "Content-Length": String(end - start + 1) },
    });
  }
  return new Response(file.buf, { headers: { ...headers, "Content-Length": String(file.size) } });
}
