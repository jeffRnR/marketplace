// app/api/vending/slots/route.ts
// GET    — owner: all slots for event with applications + bookedCount
//          public: availability only (no totalSlots, no applications)
// POST   — owner creates a slot
// PATCH  — owner edits slot (title/desc/price/totalSlots/status)
// DELETE — owner deletes slot (only if no confirmed applications)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

async function getSessionUserId(email: string) {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return user?.id ?? null;
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = Number(searchParams.get("eventId"));
    if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

    const session = await getServerSession(authOptions);
    const userId  = session?.user?.email ? await getSessionUserId(session.user.email) : null;

    const event = await prisma.event.findUnique({
      where:  { id: eventId },
      select: { createdById: true },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const isOwner = userId === event.createdById;

    if (isOwner) {
      // Owner sees everything: totalSlots, applications, bookedCount
      const slots = await prisma.vendingSlot.findMany({
        where:   { eventId },
        orderBy: { createdAt: "asc" },
        include: {
          applications: {
            orderBy: [{ hasPriority: "desc" }, { createdAt: "asc" }],
            select: {
              id:              true,
              businessName:    true,
              contactName:     true,
              contactEmail:    true,
              contactPhone:    true,
              description:     true,
              status:          true,
              hasPriority:     true,
              ownerNote:       true,
              marketProfileId: true,
              createdAt:       true,
            },
          },
        },
      });

      const enriched = slots.map((slot) => ({
        ...slot,
        bookedCount: slot.applications.filter((a) => a.status === "confirmed").length,
      }));

      return NextResponse.json(enriched);
    }

    // Public: availability only — no totalSlots exposed
    const slots = await prisma.vendingSlot.findMany({
      where:   { eventId, status: "open" },
      orderBy: { createdAt: "asc" },
      select: {
        id:          true,
        title:       true,
        description: true,
        price:       true,
        currency:    true,
        status:      true,
        _count:      { select: { applications: { where: { status: "confirmed" } } } },
      },
    });

    const publicSlots = slots.map((s) => ({
      id:          s.id,
      title:       s.title,
      description: s.description,
      price:       s.price,
      currency:    s.currency,
      status:      s.status,
      available:   true, // open slots shown as available; closed ones are filtered out above
    }));

    return NextResponse.json(publicSlots);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST — owner creates slot ─────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = await getSessionUserId(session.user.email);
    if (!userId) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const { eventId, title, description, price, currency, totalSlots } = body;

    if (!eventId || !title?.trim() || !price || !totalSlots) {
      return NextResponse.json(
        { error: "Required: eventId, title, price, totalSlots" },
        { status: 400 }
      );
    }

    const event = await prisma.event.findUnique({
      where:  { id: Number(eventId) },
      select: { createdById: true },
    });
    if (!event)                    return NextResponse.json({ error: "Event not found" }, { status: 404 });
    if (event.createdById !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const slot = await prisma.vendingSlot.create({
      data: {
        eventId:    Number(eventId),
        title:      title.trim(),
        description: description?.trim() || null,
        price:      Number(price),
        currency:   currency ?? "KES",
        totalSlots: Number(totalSlots),
        status:     "open",
      },
    });

    return NextResponse.json({ slot }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PATCH — owner edits slot ──────────────────────────────────────────────────

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = await getSessionUserId(session.user.email);
    if (!userId) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const { slotId, title, description, price, totalSlots, status } = body;
    if (!slotId) return NextResponse.json({ error: "slotId required" }, { status: 400 });

    const slot = await prisma.vendingSlot.findUnique({
      where:   { id: slotId },
      include: { event: { select: { createdById: true } } },
    });
    if (!slot)                           return NextResponse.json({ error: "Slot not found" }, { status: 404 });
    if (slot.event.createdById !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const updated = await prisma.vendingSlot.update({
      where: { id: slotId },
      data: {
        ...(title       !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(price       !== undefined && { price: Number(price) }),
        ...(totalSlots  !== undefined && { totalSlots: Number(totalSlots) }),
        ...(status      !== undefined && { status }),
      },
    });

    return NextResponse.json({ slot: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── DELETE — owner deletes slot ───────────────────────────────────────────────

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = await getSessionUserId(session.user.email);
    if (!userId) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const { slotId } = body;
    if (!slotId) return NextResponse.json({ error: "slotId required" }, { status: 400 });

    const slot = await prisma.vendingSlot.findUnique({
      where:   { id: slotId },
      include: {
        event:        { select: { createdById: true } },
        applications: { where: { status: "confirmed" }, select: { id: true } },
      },
    });
    if (!slot)                           return NextResponse.json({ error: "Slot not found" }, { status: 404 });
    if (slot.event.createdById !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (slot.applications.length > 0)    return NextResponse.json(
      { error: "Cannot delete a slot with confirmed bookings." },
      { status: 409 }
    );

    await prisma.vendingSlot.delete({ where: { id: slotId } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}