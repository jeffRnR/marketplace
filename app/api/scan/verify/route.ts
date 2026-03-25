// app/api/scan/verify/route.ts
// POST — verify a ticket scan
// No auth required — uses scanner session token
//
// Logic:
//   1. Validate session token (active, not expired)
//   2. Find OrderItem by ticketCode
//   3. Verify ticket belongs to this event
//   4. Check ordered sequence — ticket must have passed all previous stations
//   5. Check not already scanned at this station
//   6. If final station: mark ticket as checkedIn + log
//   7. If not final: just log the pass

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const { token, ticketCode } = await req.json();

  if (!token || !ticketCode?.trim())
    return NextResponse.json({ result: "invalid", message: "Missing token or ticket code." }, { status: 400 });

  // Get client IP
  const forwarded = req.headers.get("x-forwarded-for");
  const clientIP = forwarded ? forwarded.split(",")[0] : req.headers.get("x-real-ip") || "unknown";

  // 1. Validate session
  const scanSession = await prisma.scanSession.findUnique({
    where:   { token },
    include: {
      station: {
        include: {
          event: { select: { id: true, title: true } },
        },
      },
    },
  });

  if (!scanSession || !scanSession.isActive || new Date() > scanSession.expiresAt) {
    return NextResponse.json({ result: "invalid", message: "Scanner session is invalid or expired." }, { status: 403 });
  }

  // Check IP
  if (scanSession.firstAccessIP && scanSession.firstAccessIP !== clientIP) {
    return NextResponse.json({ result: "invalid", message: "This scanner link can only be used from the device it was first accessed on." }, { status: 403 });
  }

  const station = scanSession.station;
  const eventId = station.event.id;

  // 2. Find ticket
  const orderItem = await prisma.orderItem.findUnique({
    where:   { ticketCode: ticketCode.trim().toUpperCase() },
    include: { order: { select: { eventId: true, status: true } } },
  });

  // 3. Invalid ticket
  if (!orderItem || orderItem.order.eventId !== eventId || orderItem.order.status !== "confirmed") {
    await prisma.scanLog.create({
      data: { stationId: station.id, sessionId: scanSession.id, ticketCode: ticketCode.trim().toUpperCase(), result: "invalid", note: "Ticket not found or not for this event." },
    });
    return NextResponse.json({ result: "invalid", message: "Invalid ticket." });
  }

  // 4. Check ordered sequence — must have a ScanLog "success" for every station before this one
  if (station.order > 1) {
    const prevStations = await prisma.scanStation.findMany({
      where: { eventId, order: { lt: station.order }, isActive: true },
      orderBy: { order: "asc" },
    });

    for (const prev of prevStations) {
      const passedPrev = await prisma.scanLog.findFirst({
        where: { stationId: prev.id, ticketCode: orderItem.ticketCode, result: "success" },
      });
      if (!passedPrev) {
        await prisma.scanLog.create({
          data: { stationId: station.id, sessionId: scanSession.id, ticketCode: orderItem.ticketCode, result: "wrong_order", note: `Must pass ${prev.name} first.` },
        });
        return NextResponse.json({
          result:  "wrong_order",
          message: `This ticket has not passed ${prev.name} yet. Please send the attendee back.`,
        });
      }
    }
  }

  // 5. Already scanned at THIS station?
  const alreadyAtThisStation = await prisma.scanLog.findFirst({
    where: { stationId: station.id, ticketCode: orderItem.ticketCode, result: "success" },
  });

  if (alreadyAtThisStation) {
    // Check if final station — silent red screen
    const totalStations = await prisma.scanStation.count({
      where: { eventId, isActive: true },
    });

    if (station.order === totalStations) {
      await prisma.scanLog.create({
        data: { stationId: station.id, sessionId: scanSession.id, ticketCode: orderItem.ticketCode, result: "duplicate_final", note: `Previously scanned at ${alreadyAtThisStation.scannedAt.toISOString()}` },
      });
      return NextResponse.json({ result: "duplicate_final", message: "" }); // silent red — no message
    }

    // Non-final duplicate — show when it was scanned
    return NextResponse.json({
      result:  "already_scanned",
      message: `Already scanned at this station at ${alreadyAtThisStation.scannedAt.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}.`,
    });
  }

  // 6. All checks passed — log success
  const totalStations = await prisma.scanStation.count({
    where: { eventId, isActive: true },
  });
  const isFinal = station.order === totalStations;

  await prisma.$transaction(async (tx) => {
    await tx.scanLog.create({
      data: { stationId: station.id, sessionId: scanSession.id, ticketCode: orderItem.ticketCode, result: "success" },
    });

    if (isFinal) {
      await tx.orderItem.update({
        where: { id: orderItem.id },
        data:  { checkedIn: true, checkedInAt: new Date() },
      });
    }
  });

  await prisma.scanSession.update({
    where: { id: scanSession.id },
    data:  { lastUsed: new Date() },
  });

  return NextResponse.json({
    result:     "success",
    isFinal,
    ticketType: orderItem.ticketType,
    message:    isFinal ? "Entry complete. Welcome!" : `Passed ${station.name}. Proceed to next checkpoint.`,
  });
}