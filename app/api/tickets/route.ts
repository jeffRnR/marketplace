// app/api/tickets/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

async function getAuthUser(email: string) {
  return prisma.user.findUnique({ where: { email }, select: { id: true } });
}

async function verifyEventOwner(eventId: number, userId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { createdById: true },
  });
  if (!event) return { ok: false, status: 404, error: "Event not found" };
  if (event.createdById !== userId) return { ok: false, status: 403, error: "Forbidden" };
  return { ok: true };
}

// ── POST — create ticket ─────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await getAuthUser(session.user.email);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const { eventId, type, price, capacity, startsAt, endsAt, isActive } = body;

    if (!eventId || !type || price === undefined || capacity === undefined)
      return NextResponse.json({ error: "Missing required fields: eventId, type, price, capacity" }, { status: 400 });

    const ownership = await verifyEventOwner(Number(eventId), user.id);
    if (!ownership.ok)
      return NextResponse.json({ error: ownership.error }, { status: (ownership as any).status });

    const ticket = await prisma.ticket.create({
      data: {
        type,
        price:    String(price),
        link:     `capacity:${capacity}`,
        eventId:  Number(eventId),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt:   endsAt   ? new Date(endsAt)   : null,
      },
    });

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/tickets:", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}

// ── PATCH — update ticket ────────────────────────────────────────────────
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await getAuthUser(session.user.email);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const { ticketId, type, price, capacity, startsAt, endsAt, isActive } = body;

    if (!ticketId)
      return NextResponse.json({ error: "ticketId required" }, { status: 400 });

    const existing = await prisma.ticket.findUnique({
      where: { id: Number(ticketId) },
      select: { eventId: true },
    });
    if (!existing)
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    const ownership = await verifyEventOwner(existing.eventId, user.id);
    if (!ownership.ok)
      return NextResponse.json({ error: ownership.error }, { status: (ownership as any).status });

    const ticket = await prisma.ticket.update({
      where: { id: Number(ticketId) },
      data: {
        ...(type     !== undefined && { type }),
        ...(price    !== undefined && { price: String(price) }),
        ...(capacity !== undefined && { link: `capacity:${capacity}` }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(startsAt !== undefined && { startsAt: startsAt ? new Date(startsAt) : null }),
        ...(endsAt   !== undefined && { endsAt:   endsAt   ? new Date(endsAt)   : null }),
      },
    });

    return NextResponse.json({ ticket });
  } catch (err: any) {
    console.error("PATCH /api/tickets:", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}

// ── DELETE — remove ticket ───────────────────────────────────────────────
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await getAuthUser(session.user.email);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const ticketId = Number(searchParams.get("ticketId"));
    if (!ticketId)
      return NextResponse.json({ error: "ticketId required" }, { status: 400 });

    const existing = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { eventId: true },
    });
    if (!existing)
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    const ownership = await verifyEventOwner(existing.eventId, user.id);
    if (!ownership.ok)
      return NextResponse.json({ error: ownership.error }, { status: (ownership as any).status });

    await prisma.ticket.delete({ where: { id: ticketId } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/tickets:", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}