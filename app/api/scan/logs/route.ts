// app/api/scan/logs/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const stationId = searchParams.get("stationId");
  const page      = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit     = 50;

  if (!stationId)
    return NextResponse.json({ error: "stationId required" }, { status: 400 });

  // Verify ownership
  const station = await prisma.scanStation.findUnique({
    where:   { id: stationId },
    include: { event: { select: { createdById: true, title: true } } },
  });
  if (!station || station.event.createdById !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [logs, total] = await Promise.all([
    prisma.scanLog.findMany({
      where:   { stationId },
      orderBy: { scannedAt: "desc" },
      skip:    (page - 1) * limit,
      take:    limit,
      include: {
        session: { select: { label: true } },
        station: { select: { name: true, order: true } },
      },
    }),
    prisma.scanLog.count({ where: { stationId } }),
  ]);

  return NextResponse.json({ logs, total, page, pages: Math.ceil(total / limit) });
}