// app/api/ticket/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });

    const item = await prisma.orderItem.findUnique({
      where: { ticketCode: code },
      include: {
        order: {
          include: {
            event: {
              select: {
                id: true, title: true, date: true, time: true,
                location: true, host: true, image: true,
              },
            },
          },
        },
      },
    });

    if (!item) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    return NextResponse.json({
      ticketCode:  item.ticketCode,
      ticketType:  item.ticketType,
      price:       item.price,
      quantity:    item.quantity,
      holderName:  item.order.name,
      holderEmail: item.order.email,
      isRsvp:      item.order.isRsvp,
      orderId:     item.order.id,
      status:      item.order.status,
      event: {
        id:       item.order.event.id,
        title:    item.order.event.title,
        date:     new Date(item.order.event.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        time:     item.order.event.time,
        location: item.order.event.location,
        host:     item.order.event.host,
        image:    item.order.event.image,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}