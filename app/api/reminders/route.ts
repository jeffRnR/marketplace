import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendSMS } from "@/lib/at-sms";

export async function GET(req: Request) {
  const authorization = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);
  const windowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const events = await prisma.event.findMany({
    where: { date: { gte: windowStart, lt: windowEnd } },
    select: {
      id: true,
      title: true,
      date: true,
      time: true,
      location: true,
      orders: {
        where: { status: "confirmed" },
        select: { id: true, phone: true, name: true },
      },
    },
  });

  let sent = 0;
  for (const event of events) {
    for (const order of event.orders) {
      if (!order.phone?.trim()) continue;
      try {
        await prisma.eventReminder.create({ data: { eventId: event.id, orderId: order.id } });
      } catch (error: unknown) {
        if (error && typeof error === "object" && "code" in error && error.code === "P2002") continue;
        throw error;
      }
      void sendSMS(
        order.phone,
        `Hi ${order.name}, reminder: ${event.title} is on ${event.date.toLocaleDateString("en-KE")} at ${event.time}, ${event.location}. Bring your ticket QR code.`,
      );
      sent += 1;
    }
  }

  return NextResponse.json({ success: true, sent, events: events.length });
}