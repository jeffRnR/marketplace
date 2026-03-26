// app/api/scan/verify/route.ts

import { NextResponse }          from "next/server";
import prisma                    from "@/lib/prisma";
import { verifyTicketSignature } from "@/lib/ticketSigning";

async function logAndReturn(
  data: {
    stationId:  string;
    sessionId:  string;
    ticketCode: string;
    result:     string;
    note?:      string;
  },
  response: object,
  status = 200,
) {
  await prisma.scanLog.create({ data });
  return NextResponse.json(response, { status });
}

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
            select: {
              id:               true,
              title:            true,
              ticketCapacities: true,   // for capacity + lane routing
            },
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

  // 2. IP lock — bind session to first device that used it
  if (!scanSession.firstAccessIP) {
    // First use — record the IP
    await prisma.scanSession.update({
      where: { id: scanSession.id },
      data:  { firstAccessIP: clientIP },
    });
  } else {
    // Subsequent use — check IP prefix (/24) to tolerate carrier IP rotation
    const sessionPrefix = scanSession.firstAccessIP.split(".").slice(0, 3).join(".");
    const clientPrefix  = clientIP.split(".").slice(0, 3).join(".");
    if (sessionPrefix !== clientPrefix) {
      return NextResponse.json(
        {
          result:  "invalid",
          message: "This scanner link can only be used from the original device.",
        },
        { status: 403 },
      );
    }
  }

  const station = scanSession.station;
  const eventId = station.event.id;

  // 3. Verify QR signature and extract ticket code
  //    rawCode is either a signed base64url payload (new) or a plain code (legacy fallback).
  let cleanCode: string;
  let signatureVerified = false;

  try {
    const verified = verifyTicketSignature(rawCode.trim());
    // Also confirm the eventId in the payload matches this scanner's event
    if (verified.eventId !== eventId) throw new Error("EVENT_MISMATCH");
    cleanCode         = verified.ticketCode;
    signatureVerified = true;
  } catch {
    // Fallback: treat as plain ticket code for manual/legacy entry
    // Manual keyboard input goes through this path — that's fine
    cleanCode         = rawCode.trim().toUpperCase();
    signatureVerified = false;
  }

  // 4. Find the ticket
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

  // 5. Global admission gate — already checked in at a final station?
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

  // 6. Sequence check — must have passed every earlier active station
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
          // Deliberately vague — don't leak which station is missing
          message: "Complete earlier checkpoints first.",
        });
      }
    }
  }

  // 7. Already scanned at THIS station?
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

  // 8. Suspicious rapid multi-station (10s) — flag, don't hard-deny
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
        note:       `Scanned at another station ${secs}s ago. Manual verify requested.`,
      },
    });
    // Amber screen — let the human decide, don't hard-deny
    return NextResponse.json({
      result:  "suspicious",
      message: "Verify this attendee manually — ticket was scanned at another checkpoint seconds ago.",
    });
  }

  // 9. Capacity check per ticket type
  const ticketType = orderItem.ticketType;
  const capacityCfg = station.event.ticketCapacities.find(
    c => c.ticketType === ticketType,
  );

  if (capacityCfg?.maxCapacity) {
    const admitted = await prisma.orderItem.count({
      where: {
        ticketType: ticketType,
        checkedIn:  true,
        order:      { eventId },
      },
    });

    if (admitted >= capacityCfg.maxCapacity) {
      await prisma.scanLog.create({
        data: {
          stationId:  station.id,
          sessionId:  scanSession.id,
          ticketCode: cleanCode,
          result:     "capacity_exceeded",
          note:       `${ticketType} capacity ${capacityCfg.maxCapacity} reached (${admitted} admitted).`,
        },
      });
      return NextResponse.json({
        result:  "capacity_exceeded",
        message: `${ticketType} capacity is full. Contact the event organiser.`,
      });
    }
  }

  // 10. All checks passed — admit
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

  // Lane routing — pull from capacity config if set
  const laneNote = capacityCfg?.laneNote ?? null;

  return NextResponse.json({
    result:     "success",
    isFinal:    station.isFinal,
    ticketType: orderItem.ticketType,
    laneNote,
    message:    station.isFinal
      ? "Entry complete. Welcome!"
      : `Passed ${station.name}. Proceed to the next checkpoint.`,
  });
}