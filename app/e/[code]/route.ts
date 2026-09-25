// app/e/[code]/route.ts
// Universal short link redirect.
// Reads the HTTP Referer header to detect which platform the visitor came from,
// logs it to EventView, then redirects to the full event page.

import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import prisma from "@/lib/prisma";

// Maps known referer hostnames → platform keys
function detectPlatform(referer: string | null): string {
  if (!referer) return "direct";
  try {
    const host = new URL(referer).hostname.replace("www.", "");
    if (host.includes("whatsapp"))                         return "whatsapp";
    if (host.includes("instagram"))                        return "instagram";
    if (host.includes("t.co") || host.includes("twitter") || host.includes("x.com")) return "twitter";
    if (host.includes("facebook") || host.includes("fb")) return "facebook";
    if (host.includes("tiktok"))                           return "tiktok";
    if (host.includes("linkedin"))                         return "linkedin";
    if (host.includes("telegram"))                         return "telegram";
    return "other";
  } catch {
    return "other";
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const baseUrl  = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:4000";

  try {
    const event = await prisma.event.findUnique({
      where:  { shortCode: code },
      select: { id: true },
    });

    if (!event) {
      // Unknown short code — send to homepage
      return NextResponse.redirect(`${baseUrl}/events`, { status: 302 });
    }

    const referer  = req.headers.get("referer");
    const platform = detectPlatform(referer);

    // Log the view — fire and forget, never block the redirect
    prisma.eventView.create({
      data: { id: nanoid(), eventId: event.id, ref: platform },
    }).catch(() => {});

    // Also bump the pageViews counter
    prisma.event.update({
      where: { id: event.id },
      data:  { pageViews: { increment: 1 } },
    }).catch(() => {});

    // Redirect to the full event page (no ?ref= needed — already logged)
    return NextResponse.redirect(`${baseUrl}/events/${event.id}`, { status: 302 });

  } catch {
    return NextResponse.redirect(`${baseUrl}/events`, { status: 302 });
  }
}