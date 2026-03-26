// app/api/ticket/sign/route.ts
// GET /api/ticket/sign?code=XXX
// Returns a signed QR payload for the given ticket code.
// Auth: ticket must belong to the requesting user's order.

import { NextResponse } from "next/server";
import { getServerSession }  from "next-auth";
import { authOptions }       from "@/lib/auth";
import prisma                from "@/lib/prisma";
import { signTicket }        from "@/lib/ticketSigning";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code")?.trim().toUpperCase();
  if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });

  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where:  { email: session.user.email },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const item = await prisma.orderItem.findUnique({
    where:   { ticketCode: code },
    include: { order: { select: { userId: true, eventId: true } } },
  });

  // Only the ticket owner can get a signed QR
  if (!item || item.order.userId !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const signed = signTicket(code, item.order.eventId);
  return NextResponse.json({ signed });
}