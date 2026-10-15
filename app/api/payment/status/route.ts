// app/api/payment/status/route.ts
// Polled while checkout waits, then used for manual and scheduled reconciliation.
// Returns the current status of a PaymentRecord by txRef.
// Daraja callbacks verify terminal provider status before updating this record.

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { reconcileStaleDarajaPayment } from "@/lib/daraja-reconciliation";
import { sendTicketEmailForOrder } from "@/lib/ticket-email-delivery";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const txRef = searchParams.get("txRef");

  if (!txRef || txRef.length > 200) {
    return NextResponse.json({ error: "txRef required" }, { status: 400 });
  }

  let record = await prisma.paymentRecord.findUnique({
    where: { txRef },
    select: {
      id: true, status: true, type: true, orderId: true, slotApplicationId: true,
      checkoutRequestId: true,
    },
  });
  let ledgerPayment = record ? null : await prisma.payment.findUnique({
    where: { id: txRef },
    select: { id: true, status: true, orderId: true, checkoutRequestId: true },
  });
  if (!record && !ledgerPayment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  if (record?.status === "pending" && record.checkoutRequestId) {
    try {
      await reconcileStaleDarajaPayment(txRef, "record");
    } catch (error) {
      console.error("Unable to reconcile stale Daraja payment", { txRef, error });
    }
    record = await prisma.paymentRecord.findUnique({
      where: { txRef },
      select: {
        id: true, status: true, type: true, orderId: true, slotApplicationId: true,
        checkoutRequestId: true,
      },
    });
  } else if (ledgerPayment?.status === "INITIATED" && ledgerPayment.checkoutRequestId) {
    try {
      await reconcileStaleDarajaPayment(txRef, "ledger");
    } catch (error) {
      console.error("Unable to reconcile stale Daraja payment", { txRef, error });
    }
    ledgerPayment = await prisma.payment.findUnique({
      where: { id: txRef },
      select: { id: true, status: true, orderId: true, checkoutRequestId: true },
    });
  }

  // For tickets: also return ticketCodes on success so the UI can show them
  const status = record?.status ?? (
    ledgerPayment?.status === "CONFIRMED" || ledgerPayment?.status === "RELEASED"
      ? "successful"
      : ledgerPayment?.status === "FAILED"
        ? "failed"
        : "pending"
  );
  const orderId = record?.orderId ?? ledgerPayment?.orderId;
  let ticketEmailSent = false;
  if (status === "successful" && record?.type === "ticket" && record.orderId) {
    try {
      await sendTicketEmailForOrder(
        record.orderId,
        process.env.NEXT_PUBLIC_BASE_URL ?? new URL(req.url).origin,
      );
      const deliveryState = await prisma.order.findUnique({
        where: { id: record.orderId },
        select: { ticketEmailSentAt: true },
      });
      ticketEmailSent = Boolean(deliveryState?.ticketEmailSentAt);
    } catch (error) {
      console.error("Unable to deliver confirmed ticket email", { txRef, error });
    }
  }
  let ticketCodes: string[] = [];
  if (status === "successful" && orderId) {
    const items = await prisma.orderItem.findMany({
      where: { orderId },
      select: { ticketCode: true },
    });
    ticketCodes = items.map((i) => i.ticketCode);
  }

  return NextResponse.json({
    status,
    type: record?.type ?? "ticket",
    ticketCodes,
    ticketEmailSent,
    applicationId: record?.slotApplicationId ?? null,
  }, { headers: { "Cache-Control": "no-store, private" } });
}