// app/api/scan/sessions/[token]/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const scanSession = await prisma.scanSession.findUnique({
    where:   { token },
    include: {
      station: {
        include: {
          event: {
            select: { id: true, title: true, date: true, location: true, image: true },
          },
        },
      },
    },
  });

  if (!scanSession)
    return NextResponse.json({ error: "Invalid scanner link." }, { status: 404 });

  if (!scanSession.isActive)
    return NextResponse.json({ error: "This scanner link has been revoked." }, { status: 403 });

  if (new Date() > scanSession.expiresAt)
    return NextResponse.json({ error: "This scanner link has expired." }, { status: 403 });

  // Update last used timestamp
  await prisma.scanSession.update({
    where: { id: scanSession.id },
    data:  { lastUsed: new Date() },
  });

  // Use isFinal directly from the station record — single source of truth
  return NextResponse.json({
    valid:     true,
    sessionId: scanSession.id,
    label:     scanSession.label,
    expiresAt: scanSession.expiresAt,
    station: {
      id:      scanSession.station.id,
      name:    scanSession.station.name,
      order:   scanSession.station.order,
      isFinal: scanSession.station.isFinal,  // ← from DB field, not computed
    },
    event: {
      id:       scanSession.station.event.id,
      title:    scanSession.station.event.title,
      date:     scanSession.station.event.date,
      location: scanSession.station.event.location,
      image:    scanSession.station.event.image,
    },
  });
}