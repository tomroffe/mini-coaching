import { calendarUser, feedIcs, feedWeeks } from "@/lib/calendar-feed";
import { appOrigin } from "@/lib/origin";

/** Personal subscription feed: /cal/<token>.ics (no session; the token is the credential). */
export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const token = file.replace(/\.ics$/, "");
  const found = await calendarUser(token);
  if (!found) return new Response("Not found", { status: 404 });
  const weeks = await feedWeeks(found.user.id, found.groupIds);
  const body = feedIcs(await appOrigin(), token, found.user.name, weeks);
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="minis-coach.ics"',
      "Cache-Control": "private, max-age=300",
      "X-Robots-Tag": "noindex",
    },
  });
}
