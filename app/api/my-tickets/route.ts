import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { buildMyTicketsWhere, normalizeAccountEmail } from "@/lib/ticketOwnership";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const email = normalizeAccountEmail(session?.user?.email);
    if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const orders = await prisma.order.findMany({
      where: buildMyTicketsWhere(user.id, email),
      orderBy: { createdAt: "desc" },
      include: {
        event: {
          select: { id: true, title: true, date: true, time: true, location: true, image: true },
        },
        items: {
          select: {
            ticketCode: true,
            ticketType: true,
            price: true,
            quantity: true,
            checkedIn: true,
          },
        },
      },
    });

    const tickets = orders.flatMap((order) =>
      order.items.map((item) => ({
        ...item,
        orderId: order.id,
        purchasedAt: order.createdAt,
        isRsvp: order.isRsvp,
        event: order.event,
      })),
    );

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("GET /api/my-tickets:", error);
    return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 });
  }
}