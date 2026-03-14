// app/api/payment/status/route.ts
// Polled by the checkout page every 3s after STK push.
// Returns the current status of a PaymentRecord by txRef.
// Does NOT re-verify with Flutterwave — the webhook does that.

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const txRef = searchParams.get("txRef");

  if (!txRef) {
    return NextResponse.json({ error: "txRef required" }, { status: 400 });
  }

  const record = await prisma.paymentRecord.findUnique({
    where:  { txRef },
    select: { status: true, type: true, orderId: true, slotApplicationId: true },
  });

  if (!record) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  // For tickets: also return ticketCodes on success so the UI can show them
  let ticketCodes: string[] = [];
  if (record.status === "successful" && record.type === "ticket" && record.orderId) {
    const items = await prisma.orderItem.findMany({
      where:  { orderId: record.orderId },
      select: { ticketCode: true },
    });
    ticketCodes = items.map((i) => i.ticketCode);
  }

  return NextResponse.json({
    status:     record.status,   // "pending" | "successful" | "failed"
    type:       record.type,
    ticketCodes,
    applicationId: record.slotApplicationId,
  });
}