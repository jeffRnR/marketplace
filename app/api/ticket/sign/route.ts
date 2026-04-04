// app/api/ticket/sign/route.ts
// No auth required — the ticketCode itself is the secret.
// Only someone who knows the ticketCode can get a signed QR for it.
// The ticketCode is already a UUID (unguessable) so possession = ownership.

import { NextResponse }   from "next/server";
import prisma             from "@/lib/prisma";
import { signTicket }     from "@/lib/ticketSigning";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code")?.trim().toUpperCase();
  if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });

  const item = await prisma.orderItem.findUnique({
    where:   { ticketCode: code },
    include: { order: { select: { eventId: true, status: true } } },
  });

  if (!item || item.order.status !== "confirmed")
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const signed = signTicket(code, item.order.eventId);
  return NextResponse.json({ signed });
}