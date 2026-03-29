// middleware.ts — project root (same level as package.json)

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isWaitlist =
    pathname === "/waitlist" ||
    pathname.startsWith("/waitlist/");

  const waitlistMode = process.env.WAITLIST_MODE === "true";

  // Always allow these through regardless of mode
  const alwaysAllow =
    isWaitlist ||
    pathname.startsWith("/api/waitlist") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/videos") ||
    pathname.startsWith("/fonts") ||
    !!pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|gif|mp4|css|js|woff|woff2)$/);

  // In waitlist mode, redirect everything except allowed paths
  if (waitlistMode && !alwaysAllow) {
    return NextResponse.redirect(new URL("/waitlist", req.url));
  }

  // Stamp a header so the root layout knows it's the waitlist route
  const res = NextResponse.next();
  if (isWaitlist) {
    res.headers.set("x-is-waitlist", "1");
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};