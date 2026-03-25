// app/api/scan/stations/route.ts
// GET  — list all stations for an event (owner only)
// POST — create a new station
// PATCH — update / reorder / toggle active
// DELETE — remove a station

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

async function getOwner(email: string) {
  return prisma.user.findUnique({ where: { email }, select: { id: true } });
}

async function assertOwner(userId: string, eventId: number) {
  const event = await prisma.event.findUnique({
    where: { id: eventId }, select: { createdById: true },
  });
  return event?.createdById === userId;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const eventId = Number(searchParams.get("eventId"));
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

  const user = await getOwner(session.user.email);
  if (!user || !await assertOwner(user.id, eventId))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const stations = await prisma.scanStation.findMany({
    where:   { eventId },
    orderBy: { order: "asc" },
    include: {
      _count:   { select: { logs: true, sessions: true } },
      sessions: { select: { id: true, token: true, label: true, expiresAt: true, isActive: true, lastUsed: true } },
    },
  });

  return NextResponse.json(stations);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getOwner(session.user.email);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { eventId, name } = await req.json();
  if (!eventId || !name?.trim())
    return NextResponse.json({ error: "eventId and name required" }, { status: 400 });

  if (!await assertOwner(user.id, Number(eventId)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Next order number
  const max = await prisma.scanStation.aggregate({
    where: { eventId: Number(eventId) },
    _max:  { order: true },
  });
  const nextOrder = (max._max.order ?? 0) + 1;

  const station = await prisma.scanStation.create({
    data: { eventId: Number(eventId), name: name.trim(), order: nextOrder },
  });

  return NextResponse.json(station, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getOwner(session.user.email);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { stationId, name, isActive, order } = await req.json();
  if (!stationId) return NextResponse.json({ error: "stationId required" }, { status: 400 });

  const station = await prisma.scanStation.findUnique({
    where: { id: stationId }, select: { eventId: true },
  });
  if (!station || !await assertOwner(user.id, station.eventId))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updated = await prisma.scanStation.update({
    where: { id: stationId },
    data:  {
      ...(name     !== undefined ? { name: name.trim() } : {}),
      ...(isActive !== undefined ? { isActive }          : {}),
      ...(order    !== undefined ? { order }              : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getOwner(session.user.email);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const stationId = searchParams.get("stationId");
  if (!stationId) return NextResponse.json({ error: "stationId required" }, { status: 400 });

  const station = await prisma.scanStation.findUnique({
    where: { id: stationId }, select: { eventId: true },
  });
  if (!station || !await assertOwner(user.id, station.eventId))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.scanStation.delete({ where: { id: stationId } });
  return NextResponse.json({ success: true });
}