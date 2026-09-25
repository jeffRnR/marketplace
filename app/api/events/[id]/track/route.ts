// app/api/events/[id]/track/route.ts
// POST — records a page view with an optional referrer.
// Called client-side on event page load. No auth required.

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const VALID_REFS = new Set(["whatsapp","instagram","twitter","facebook","tiktok","direct","other"]);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    if (!eventId?.trim()) return new NextResponse(null, { status: 204 });

    const { searchParams } = new URL(req.url);
    const raw = searchParams.get("ref") ?? "direct";
    const ref = VALID_REFS.has(raw) ? raw : "other";

    // Fire-and-forget: create view row + increment counter
    await prisma.$transaction([
      prisma.eventView.create({ data: { eventId, ref } }),
      prisma.event.update({
        where: { id: eventId },
        data:  { pageViews: { increment: 1 } },
      }),
    ]);

    return new NextResponse(null, { status: 204 });
  } catch {
    // Never fail the page load over a tracking error
    return new NextResponse(null, { status: 204 });
  }
}