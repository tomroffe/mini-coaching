import "server-only";
import { headers } from "next/headers";

/** Public origin for links/QR codes: APP_URL if set, else the forwarded host the request came in on. */
export async function appOrigin() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
}
