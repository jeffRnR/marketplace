// app/api/ticket/sign/route.ts

import { NextResponse }      from "next/server";
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

  const item = await prisma.orderItem.findUnique({
    where:   { ticketCode: code },
    include: { order: { select: { email: true, eventId: true } } },
  });

  // Order email must match the logged-in user's email
  if (!item || item.order.email !== session.user.email)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const signed = signTicket(code, item.order.eventId);
  return NextResponse.json({ signed });
}