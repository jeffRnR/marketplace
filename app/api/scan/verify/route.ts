// app/api/scan/verify/route.ts — DEBUG VERSION

import { NextResponse }          from "next/server";
import prisma                    from "@/lib/prisma";
import { verifyTicketSignature } from "@/lib/ticketSigning";

export async function POST(req: Request) {
  const body = await req.json();
  const { token, ticketCode: rawCode } = body;

  console.log("VERIFY 1: received", { token: token?.slice(0, 8), rawCode });

  if (!token || !rawCode?.trim())
    return NextResponse.json({ result: "invalid", message: "Missing token or ticket code." }, { status: 400 });

  const forwarded = req.headers.get("x-forwarded-for");
  const clientIP  = forwarded?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "unknown";

  // 1. Validate session
  let scanSession: any;
  try {
    scanSession = await prisma.scanSession.findUnique({
      where:   { token },
      include: {
        station: {
          include: {
            event: { select: { id: true, title: true } },
          },
        },
      },
    });
    console.log("VERIFY 2: session found", {
      found:     !!scanSession,
      isActive:  scanSession?.isActive,
      expired:   scanSession ? new Date() > scanSession.expiresAt : null,
      stationId: scanSession?.stationId,
      eventId:   scanSession?.station?.event?.id,
    });
  } catch (err) {
    console.error("VERIFY 2 CRASH — session lookup failed:", err);
    return NextResponse.json({ result: "invalid", message: "Session lookup failed." });
  }

  if (!scanSession || !scanSession.isActive || new Date() > scanSession.expiresAt) {
    return NextResponse.json(
      { result: "invalid", message: "Scanner session is invalid or expired." },
      { status: 403 },
    );
  }

  // 2. IP lock
  try {
    if (!scanSession.firstAccessIP) {
      await prisma.scanSession.update({
        where: { id: scanSession.id },
        data:  { firstAccessIP: clientIP },
      });
      console.log("VERIFY 3: IP recorded", clientIP);
    } else {
      const sessionPrefix = scanSession.firstAccessIP.split(".").slice(0, 3).join(".");
      const clientPrefix  = clientIP.split(".").slice(0, 3).join(".");
      console.log("VERIFY 3: IP check", { sessionPrefix, clientPrefix, match: sessionPrefix === clientPrefix });
      if (sessionPrefix !== clientPrefix) {
        return NextResponse.json(
          { result: "invalid", message: "This scanner link can only be used from the original device." },
          { status: 403 },
        );
      }
    }
  } catch (err) {
    console.error("VERIFY 3 CRASH — IP lock failed:", err);
    return NextResponse.json({ result: "invalid", message: "IP lock error." });
  }

  const station = scanSession.station;
  const eventId = station.event.id;
  console.log("VERIFY 4: station", { stationName: station.name, stationOrder: station.order, isFinal: station.isFinal, eventId });

  // 3. Resolve ticket code
  let cleanCode: string;
  let signatureVerified = false;

  try {
    const verified = verifyTicketSignature(rawCode.trim());
    if (verified.eventId !== eventId) throw new Error("EVENT_MISMATCH");
    cleanCode         = verified.ticketCode;
    signatureVerified = true;
    console.log("VERIFY 5: signature verified, code =", cleanCode);
  } catch (sigErr) {
    const raw = rawCode.trim().toUpperCase();
    console.log("VERIFY 5: signature failed, trying fallback. raw =", raw, "error =", sigErr);

    if (/^[0-9A-F]{6,12}$/.test(raw)) {
      try {
        const match = await prisma.orderItem.findFirst({
          where: {
            ticketCode: { startsWith: raw.toLowerCase() },
            order:      { eventId },
          },
        });
        console.log("VERIFY 5: short code lookup", { raw, found: !!match, foundCode: match?.ticketCode });
        cleanCode = match?.ticketCode ?? raw;
      } catch (err) {
        console.error("VERIFY 5 CRASH — short code lookup failed:", err);
        cleanCode = raw;
      }
    } else {
      cleanCode = raw;
    }
    signatureVerified = false;
  }

  console.log("VERIFY 6: cleanCode =", cleanCode, "signatureVerified =", signatureVerified);

  // 4. Find ticket
  let orderItem: any;
  try {
    orderItem = await prisma.orderItem.findUnique({
      where:   { ticketCode: cleanCode },
      include: { order: { select: { eventId: true, status: true } } },
    });
    console.log("VERIFY 7: orderItem", {
      found:        !!orderItem,
      orderEventId: orderItem?.order?.eventId,
      orderStatus:  orderItem?.order?.status,
      scanEventId:  eventId,
      eventMatch:   orderItem?.order?.eventId === eventId,
      statusOk:     orderItem?.order?.status === "confirmed",
    });
  } catch (err) {
    console.error("VERIFY 7 CRASH — orderItem lookup failed:", err);
    return NextResponse.json({ result: "invalid", message: "Ticket lookup failed." });
  }

  if (!orderItem || orderItem.order.eventId !== eventId || orderItem.order.status !== "confirmed") {
    await prisma.scanLog.create({
      data: {
        stationId:  station.id,
        sessionId:  scanSession.id,
        ticketCode: cleanCode,
        result:     "invalid",
        note:       `orderItem=${!!orderItem} eventMatch=${orderItem?.order?.eventId === eventId} status=${orderItem?.order?.status} sig=${signatureVerified}`,
      },
    });
    return NextResponse.json({ result: "invalid", message: "Invalid ticket." });
  }

  // 5. Already admitted?
  console.log("VERIFY 8: checkedIn =", orderItem.checkedIn);
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
    console.log("VERIFY 9: prevStations", prevStations.map(p => p.name));

    for (const prev of prevStations) {
      const passed = await prisma.scanLog.findFirst({
        where: { stationId: prev.id, ticketCode: cleanCode, result: "success" },
      });
      console.log("VERIFY 9: passed", prev.name, "=", !!passed);
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
        return NextResponse.json({ result: "wrong_order", message: "Complete earlier checkpoints first." });
      }
    }
  }

  // 7. Already scanned here?
  const alreadyHere = await prisma.scanLog.findFirst({
    where: { stationId: station.id, ticketCode: cleanCode, result: "success" },
  });
  console.log("VERIFY 10: alreadyHere =", !!alreadyHere);

  if (alreadyHere) {
    return NextResponse.json({
      result:  "already_scanned",
      message: `Already scanned here at ${new Intl.DateTimeFormat("en-KE", { hour: "2-digit", minute: "2-digit" }).format(alreadyHere.scannedAt)}.`,
    });
  }

  // 8. Fraud check
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
  console.log("VERIFY 11: recentElsewhere =", !!recentElsewhere);

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
      message: "Verify this attendee manually.",
    });
  }

  // 9. Admit
  console.log("VERIFY 12: admitting ticket, isFinal =", station.isFinal);
  try {
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
    console.log("VERIFY 13: transaction complete");
  } catch (err) {
    console.error("VERIFY 12 CRASH — transaction failed:", err);
    return NextResponse.json({ result: "invalid", message: "Admission transaction failed." });
  }

  await prisma.scanSession.update({
    where: { id: scanSession.id },
    data:  { lastUsed: new Date() },
  });

  return NextResponse.json({
    result:     "success",
    isFinal:    station.isFinal,
    ticketType: orderItem.ticketType,
    laneNote:   null,
    message:    station.isFinal
      ? "Entry complete. Welcome!"
      : `Passed ${station.name}. Proceed to the next checkpoint.`,
  });
}