import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic check only: bounce visitors without a session cookie to /login.
 * Real verification (signature, active user, role) happens in requireUser()/getAccess().
 */
export function proxy(req: NextRequest) {
  if (!req.cookies.has("crc_session")) {
    if (req.nextUrl.pathname.startsWith("/api/")) return new NextResponse("Unauthorised", { status: 401 });
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|invite|enrol|logout|_next|favicon|manifest|icon|apple-icon|icon\\.svg).*)"],
};
