// app/api/scan/verify/route.ts

import { NextResponse }          from "next/server";
import prisma                    from "@/lib/prisma";
import { verifyTicketSignature } from "@/lib/ticketSigning";

export async function POST(req: Request) {
  const body = await req.json();
  const { token, ticketCode: rawCode } = body;

  if (!token || !rawCode?.trim())
    return NextResponse.json(
      { result: "invalid", message: "Missing token or ticket code." },
      { status: 400 },
    );

  const forwarded = req.headers.get("x-forwarded-for");
  const clientIP  = forwarded?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown";

  // 1. Validate session
  const scanSession = await prisma.scanSession.findUnique({
    where:   { token },
    include: {
      station: {
        include: {
          event: {
            select: { id: true, title: true },
          },
        },
      },
    },
  });

  if (!scanSession || !scanSession.isActive || new Date() > scanSession.expiresAt) {
    return NextResponse.json(
      { result: "invalid", message: "Scanner session is invalid or expired." },
      { status: 403 },
    );
  }

  // 2. IP lock — bind session to first device that scans (not page load)
  //    Uses /24 prefix to tolerate carrier IP rotation on mobile networks
  if (!scanSession.firstAccessIP) {
    await prisma.scanSession.update({
      where: { id: scanSession.id },
      data:  { firstAccessIP: clientIP },
    });
  } else {
    const sessionPrefix = scanSession.firstAccessIP.split(".").slice(0, 3).join(".");
    const clientPrefix  = clientIP.split(".").slice(0, 3).join(".");
    if (sessionPrefix !== clientPrefix) {
      return NextResponse.json(
        { result: "invalid", message: "This scanner link can only be used from the original device." },
        { status: 403 },
      );
    }
  }

  const station = scanSession.station;
  const eventId = station.event.id;

  // 3. Verify QR signature — fallback to plain code for manual entry
  let cleanCode: string;
  let signatureVerified = false;

  try {
    const verified = verifyTicketSignature(rawCode.trim());
    if (verified.eventId !== eventId) throw new Error("EVENT_MISMATCH");
    cleanCode         = verified.ticketCode;
    signatureVerified = true;
  } catch {
    cleanCode         = rawCode.trim().toUpperCase();
    signatureVerified = false;
  }

  // 4. Find ticket
  const orderItem = await prisma.orderItem.findUnique({
    where:   { ticketCode: cleanCode },
    include: { order: { select: { eventId: true, status: true } } },
  });

  if (
    !orderItem ||
    orderItem.order.eventId !== eventId ||
    orderItem.order.status !== "confirmed"
  ) {
    await prisma.scanLog.create({
      data: {
        stationId:  station.id,
        sessionId:  scanSession.id,
        ticketCode: cleanCode,
        result:     "invalid",
        note:       signatureVerified
          ? "Signature valid but ticket not found or wrong event."
          : "Ticket not found, wrong event, or unsigned code.",
      },
    });
    return NextResponse.json({ result: "invalid", message: "Invalid ticket." });
  }

  // 5. Already fully admitted?
  if (orderItem.checkedIn) {
    await prisma.scanLog.create({
      data: {
        stationId:  station.id,
        sessionId:  scanSession.id,
        ticketCode: cleanCode,
        result:     "duplicate_final",
        note:       `Admitted at ${orderItem.checkedInAt?.toISOString() ?? "unknown"}.`,
      },
    });
    return NextResponse.json({ result: "duplicate_final", message: "" });
  }

  // 6. Sequence check
  if (station.order > 1) {
    const prevStations = await prisma.scanStation.findMany({
      where:   { eventId, isActive: true, order: { lt: station.order } },
      select:  { id: true, name: true, order: true },
      orderBy: { order: "asc" },
    });

    for (const prev of prevStations) {
      const passed = await prisma.scanLog.findFirst({
        where: { stationId: prev.id, ticketCode: cleanCode, result: "success" },
      });
      if (!passed) {
        await prisma.scanLog.create({
          data: {
            stationId:  station.id,
            sessionId:  scanSession.id,
            ticketCode: cleanCode,
            result:     "wrong_order",
            note:       `Missing pass at station ${prev.order}.`,
          },
        });
        return NextResponse.json({
          result:  "wrong_order",
          message: "Complete earlier checkpoints first.",
        });
      }
    }
  }

  // 7. Already scanned at this station?
  const alreadyHere = await prisma.scanLog.findFirst({
    where: { stationId: station.id, ticketCode: cleanCode, result: "success" },
  });

  if (alreadyHere) {
    return NextResponse.json({
      result:  "already_scanned",
      message: `Already scanned here at ${new Intl.DateTimeFormat("en-KE", {
        hour: "2-digit", minute: "2-digit",
      }).format(alreadyHere.scannedAt)}.`,
    });
  }

  // 8. Suspicious rapid multi-station (10s) — amber, not hard deny
  const recentElsewhere = await prisma.scanLog.findFirst({
    where: {
      ticketCode: cleanCode,
      result:     "success",
      stationId:  { not: station.id },
      scannedAt:  { gte: new Date(Date.now() - 10_000) },
    },
    include: { station: { select: { name: true } } },
    orderBy: { scannedAt: "desc" },
  });

  if (recentElsewhere) {
    const secs = Math.round((Date.now() - recentElsewhere.scannedAt.getTime()) / 1000);
    await prisma.scanLog.create({
      data: {
        stationId:  station.id,
        sessionId:  scanSession.id,
        ticketCode: cleanCode,
        result:     "suspicious",
        note:       `Scanned at another station ${secs}s ago.`,
      },
    });
    return NextResponse.json({
      result:  "suspicious",
      message: "Verify this attendee manually — ticket was scanned at another checkpoint seconds ago.",
    });
  }

  // 9. All checks passed — admit
  await prisma.$transaction(async (tx) => {
    await tx.scanLog.create({
      data: {
        stationId:  station.id,
        sessionId:  scanSession.id,
        ticketCode: cleanCode,
        result:     "success",
        note:       `IP: ${clientIP} | sig: ${signatureVerified ? "verified" : "unsigned/manual"}`,
      },
    });

    if (station.isFinal) {
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
    isFinal:    station.isFinal,
    ticketType: orderItem.ticketType,
    laneNote:   null,  // populate later when EventTicketCapacity is added
    message:    station.isFinal
      ? "Entry complete. Welcome!"
      : `Passed ${station.name}. Proceed to the next checkpoint.`,
  });
}