// app/api/scan/sessions/route.ts
// POST — create a scanner session (tokenized link) for a station
// DELETE — revoke a session

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { randomBytes } from "crypto";
import prisma from "@/lib/prisma";

async function getOwner(email: string) {
  return prisma.user.findUnique({ where: { email }, select: { id: true } });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getOwner(session.user.email);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { stationId, label, expiresInHours } = await req.json();
  if (!stationId || !label?.trim() || !expiresInHours)
    return NextResponse.json({ error: "stationId, label and expiresInHours required" }, { status: 400 });

  // Verify caller owns the event this station belongs to
  const station = await prisma.scanStation.findUnique({
    where:   { id: stationId },
    include: { event: { select: { createdById: true } } },
  });
  if (!station || station.event.createdById !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const token     = randomBytes(32).toString("hex"); // 64-char hex, not guessable
  const expiresAt = new Date(Date.now() + Number(expiresInHours) * 60 * 60 * 1000);

  const scanSession = await prisma.scanSession.create({
    data: { stationId, token, label: label.trim(), expiresAt },
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:4000";
  return NextResponse.json({
    session: scanSession,
    url: `${baseUrl}/scan/${token}`,
  }, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getOwner(session.user.email);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  const scanSession = await prisma.scanSession.findUnique({
    where:   { id: sessionId },
    include: { station: { include: { event: { select: { createdById: true } } } } },
  });
  if (!scanSession || scanSession.station.event.createdById !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.scanSession.update({
    where: { id: sessionId },
    data:  { isActive: false },
  });

  return NextResponse.json({ success: true });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getOwner(session.user.email);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { sessionId, isEmailed } = await req.json();
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  const scanSession = await prisma.scanSession.findUnique({
    where:   { id: sessionId },
    include: { station: { include: { event: { select: { createdById: true } } } } },
  });
  if (!scanSession || scanSession.station.event.createdById !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updated = await prisma.scanSession.update({
    where: { id: sessionId },
    data:  { isEmailed } as any,
  });

  return NextResponse.json(updated);
}