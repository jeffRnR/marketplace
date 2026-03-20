// app/api/my-events/[eventId]/attendees/route.ts
// GET — returns all confirmed orders + order items for an event.
// Only accessible by the event owner.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where:  { email: session.user.email },
      select: { id: true },
    });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const eventId = Number(params.eventId);

    const event = await prisma.event.findUnique({
      where:  { id: eventId },
      select: { createdById: true },
    });
    if (!event)
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    if (event.createdById !== user.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const orders = await prisma.order.findMany({
      where:   { eventId, status: "confirmed" },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    // Flatten to one row per ticket item
    const attendees = orders.flatMap((order) =>
      order.items.map((item) => ({
        orderId:     order.id,
        name:        order.name,
        email:       order.email,
        phone:       order.phone,
        ticketType:  item.ticketType,
        ticketCode:  item.ticketCode,
        quantity:    item.quantity,
        price:       item.price,
        isRsvp:      order.isRsvp,
        purchasedAt: order.createdAt.toISOString(),
      }))
    );

    return NextResponse.json({ attendees, total: attendees.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}