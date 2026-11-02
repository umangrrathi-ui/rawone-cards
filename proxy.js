import { NextResponse } from "next/server";

// CSRF: block cross-site writes and force JSON bodies on API writes.
export function proxy(req) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return NextResponse.next();
  const origin = req.headers.get("origin");
  if (origin) {
    const allowed = new Set([req.headers.get("host"), req.headers.get("x-forwarded-host")]);
    try {
      if (process.env.BASE_URL) allowed.add(new URL(process.env.BASE_URL).host);
      if (!allowed.has(new URL(origin).host)) {
        return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Bad origin" }, { status: 403 });
    }
  }
  if (["POST", "PUT", "PATCH"].includes(req.method) && req.nextUrl.pathname.startsWith("/api/")) {
    if (!(req.headers.get("content-type") || "").startsWith("application/json")) {
      return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/api/:path*"] };
