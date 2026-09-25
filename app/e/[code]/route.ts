// app/e/[code]/route.ts
// Universal short link redirect.
// Detects platform from User-Agent first (more reliable),
// then falls back to Referer header.

import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import prisma from "@/lib/prisma";

function detectPlatform(referer: string | null, userAgent: string | null): string {
  const ua = (userAgent ?? "").toLowerCase();

  // User-Agent checks are more reliable than Referer for social crawlers
  if (ua.includes("whatsapp"))                              return "whatsapp";
  if (ua.includes("instagram"))                             return "instagram";
  if (ua.includes("tiktok") || ua.includes("bytespider"))  return "tiktok";
  if (ua.includes("twitter") || ua.includes("twitterbot")) return "twitter";
  if (ua.includes("facebookexternalhit") || ua.includes("facebookcatalog")) return "facebook";
  if (ua.includes("linkedinbot"))                          return "linkedin";
  if (ua.includes("telegrambot"))                          return "telegram";

  // Fall back to Referer header
  if (!referer) return "direct";
  try {
    const host = new URL(referer).hostname.replace("www.", "");
    if (host.includes("whatsapp"))                          return "whatsapp";
    if (host.includes("instagram"))                         return "instagram";
    if (host.includes("t.co") || host.includes("twitter") || host.includes("x.com")) return "twitter";
    if (host.includes("facebook") || host.includes("fb"))  return "facebook";
    if (host.includes("tiktok"))                            return "tiktok";
    if (host.includes("linkedin"))                          return "linkedin";
    if (host.includes("telegram"))                          return "telegram";
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
      return NextResponse.redirect(`${baseUrl}/events`, { status: 302 });
    }

    const referer   = req.headers.get("referer");
    const userAgent = req.headers.get("user-agent");
    const platform  = detectPlatform(referer, userAgent);

    // Log view — fire and forget
    prisma.eventView.create({
      data: { id: nanoid(), eventId: event.id, ref: platform },
    }).catch(() => {});

    prisma.event.update({
      where: { id: event.id },
      data:  { pageViews: { increment: 1 } },
    }).catch(() => {});

    // Pass ref as query param so TrackView and checkout can read it
    return NextResponse.redirect(
      `${baseUrl}/events/${event.id}?ref=${platform}`,
      { status: 302 }
    );

  } catch {
    return NextResponse.redirect(`${baseUrl}/events`, { status: 302 });
  }
}