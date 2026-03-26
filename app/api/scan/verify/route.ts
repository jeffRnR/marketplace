import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const { token, ticketCode } = await req.json();
  if (!token || !ticketCode?.trim())
    return NextResponse.json({ result: "invalid", message: "Missing token or ticket code." }, { status: 400 });

  const cleanCode = String(ticketCode).trim().toUpperCase();
  const userAgent = req.headers.get("user-agent") || "unknown";
  const forwarded = req.headers.get("x-forwarded-for");
  const clientIP = forwarded?.split(",")[0] || req.headers.get("x-real-ip") || "unknown";

  const scanSession = await prisma.scanSession.findUnique({
    where: { token },
    include: { station: { include: { event: { select: { id: true, title: true } } } } },
  });

  if (!scanSession || !scanSession.isActive || new Date() > scanSession.expiresAt) {
    return NextResponse.json({ result: "invalid", message: "Scanner session is invalid or expired." }, { status: 403 });
  }

  // Device lock removed because userAgent field doesn't exist
  const station = scanSession.station;
  const eventId = station.event.id;

  const orderItem = await prisma.orderItem.findUnique({
    where: { ticketCode: cleanCode },
    include: { order: { select: { eventId: true, status: true } } },
  });

  if (!orderItem || orderItem.order.eventId !== eventId || orderItem.order.status !== "confirmed") {
    await prisma.scanLog.create({
      data: { stationId: station.id, sessionId: scanSession.id, ticketCode: cleanCode, result: "invalid", note: "Ticket not found or not for this event." },
    });
    return NextResponse.json({ result: "invalid", message: "Invalid ticket." });
  }

  // Check order sequence
  if (station.order > 1) {
    const passedCount = await prisma.scanLog.count({
      where: { ticketCode: cleanCode, result: "success", station: { eventId, order: { lt: station.order } } },
    });
    if (passedCount < station.order - 1) {
      await prisma.scanLog.create({
        data: { stationId: station.id, sessionId: scanSession.id, ticketCode: cleanCode, result: "wrong_order", note: "Has not passed all previous checkpoints." },
      });
      return NextResponse.json({ result: "wrong_order", message: "Ticket has not passed all previous checkpoints." });
    }
  }

  const alreadyAtThisStation = await prisma.scanLog.findFirst({
    where: { stationId: station.id, ticketCode: cleanCode, result: "success" },
  });

  if (alreadyAtThisStation) {
    const totalStations = await prisma.scanStation.count({ where: { eventId, isActive: true } });
    if (station.order === totalStations) {
      await prisma.scanLog.create({
        data: { stationId: station.id, sessionId: scanSession.id, ticketCode: cleanCode, result: "duplicate_final", note: `Previously scanned at ${alreadyAtThisStation.scannedAt.toISOString()}` },
      });
      return NextResponse.json({ result: "duplicate_final", message: "" });
    }
    return NextResponse.json({
      result: "already_scanned",
      message: `Already scanned at this station at ${new Intl.DateTimeFormat("en-KE", { hour: "2-digit", minute: "2-digit" }).format(alreadyAtThisStation.scannedAt)}.`,
    });
  }

  // Anti-fraud: rapid multi-station (10s)
  const recentScan = await prisma.scanLog.findFirst({
    where: { ticketCode: cleanCode, result: "success", scannedAt: { gte: new Date(Date.now() - 10 * 1000) } },
    include: { station: true },
    orderBy: { scannedAt: "desc" },
  });

  if (recentScan && recentScan.stationId !== station.id) {
    await prisma.scanLog.create({
      data: { stationId: station.id, sessionId: scanSession.id, ticketCode: cleanCode, result: "fraud_detected", note: `Scanned at ${recentScan.station.name} ${Math.round((Date.now() - recentScan.scannedAt.getTime())/1000)}s ago` },
    });
    return NextResponse.json({ result: "invalid", fraud: true, message: "Ticket already used at another checkpoint." });
  }

  const totalStations = await prisma.scanStation.count({ where: { eventId, isActive: true } });
  const isFinal = station.order === totalStations;

  await prisma.$transaction(async (tx) => {
    await tx.scanLog.create({ data: { stationId: station.id, sessionId: scanSession.id, ticketCode: cleanCode, result: "success", note: `IP: ${clientIP}` } });
    if (isFinal) await tx.orderItem.update({ where: { id: orderItem.id }, data: { checkedIn: true, checkedInAt: new Date() } });
  });

  await prisma.scanSession.update({ where: { id: scanSession.id }, data: { lastUsed: new Date() } });

  return NextResponse.json({
    result: "success",
    isFinal,
    ticketType: orderItem.ticketType,
    message: isFinal ? "Entry complete. Welcome!" : `Passed ${station.name}. Proceed to next checkpoint.`,
  });
}