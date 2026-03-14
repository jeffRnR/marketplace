// app/api/events/[id]/owner/route.ts
// Returns the event owner's email — used by the vending page to detect
// if the current viewer is the event owner (to block applying + show share link).

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const event = await prisma.event.findUnique({
      where: { id: Number(id) },
      select: {
        createdBy: {
          select: { email: true },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ ownerEmail: event.createdBy.email });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}