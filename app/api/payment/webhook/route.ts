// app/api/payment/webhook/route.ts
// Unified IntaSend webhook handler — tickets + vending slot payments.
//
// IntaSend webhook payload shape:
// {
//   "invoice_id": "BRZKGPR",
//   "state": "COMPLETE" | "FAILED" | "PROCESSING" | "PENDING",
//   "api_ref": "<our UUID stored in PaymentRecord.txRef>",
//   "value": "1500.00",
//   "currency": "KES",
//   "account": "254712...",
//   "challenge": "<your INTASEND_WEBHOOK_CHALLENGE string>",
//   "failed_reason": null,
//   ...
// }
//
// SECURITY:
//   1. Verify challenge field (constant-time) before touching DB
//   2. Re-verify transaction with IntaSend status API
//   3. Amount sanity check
//   4. Idempotent — safe to receive duplicate webhook events
//   5. All DB mutations inside prisma.$transaction()

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyWebhookChallenge, verifyTransaction } from "@/lib/intasend";
import { creditWallet } from "@/lib/wallet";
import {
  sendTicketEmail,
  sendVendingConfirmationEmail,
  sendSMS,
} from "@/lib/notifications";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 1. Verify webhook challenge
  const challenge = body.challenge as string | undefined;
  if (!verifyWebhookChallenge(challenge)) {
    console.warn("❌ Webhook: invalid challenge", { received: challenge });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // IntaSend fires webhooks on every state change — only act on terminal states
  const state     = String(body.state ?? "").toUpperCase();
  const invoiceId = String(body.invoice_id ?? "");
  const apiRef    = String(body.api_ref    ?? "");  // our UUID (txRef)

  if (!invoiceId || !apiRef) {
    console.error("❌ Webhook: missing invoice_id or api_ref", body);
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Ignore non-terminal states — IntaSend also fires PENDING and PROCESSING
  if (state !== "COMPLETE" && state !== "FAILED") {
    return NextResponse.json({ received: true, note: `Ignored state: ${state}` });
  }

  // 2. Look up our PaymentRecord by api_ref (= txRef)
  const record = await prisma.paymentRecord.findUnique({ where: { txRef: apiRef } });
  if (!record) {
    console.warn(`❌ Webhook: no PaymentRecord for api_ref=${apiRef}`);
    return NextResponse.json({ received: true });
  }

  // 3. Idempotency — already processed
  if (record.status === "successful") {
    console.log(`ℹ️  Webhook: api_ref=${apiRef} already processed`);
    return NextResponse.json({ received: true });
  }

  // 4. Re-verify with IntaSend API — never trust webhook payload alone
  const verified = await verifyTransaction(invoiceId);

  if (!verified.success || verified.state !== "COMPLETE") {
    await prisma.paymentRecord.update({
      where: { id: record.id },
      data:  { status: "failed" },
    });
    console.warn(`❌ Webhook: transaction ${invoiceId} state=${verified.state}`);
    return NextResponse.json({ received: true });
  }

  // 5. Amount sanity check — allow KES 1 rounding tolerance
  const amountMatch = Math.abs(verified.amount - record.amount) < 1;
  if (!amountMatch) {
    console.error(
      `❌ Webhook: amount mismatch api_ref=${apiRef}. ` +
      `Expected ${record.amount}, got ${verified.amount}`
    );
    await prisma.paymentRecord.update({
      where: { id: record.id },
      data:  { status: "failed" },
    });
    return NextResponse.json({ received: true });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  // 6. Route to correct handler based on payment type
  if (record.type === "ticket" && record.orderId) {
    await handleTicketPayment(record, invoiceId, baseUrl);
  } else if (record.type === "vending_slot" && record.slotApplicationId) {
    await handleVendingPayment(record, invoiceId, baseUrl);
  } else {
    console.error(`❌ Webhook: unknown type=${record.type} for api_ref=${apiRef}`);
  }

  return NextResponse.json({ received: true });
}

// ─── Ticket payment confirmed ─────────────────────────────────────────────────

async function handleTicketPayment(
  record: { id: string; orderId: string | null; txRef: string; amount: number },
  invoiceId: string,
  baseUrl: string
) {
  const order = await prisma.order.findUnique({
    where:   { id: record.orderId! },
    include: {
      items: true,
      event: { select: { title: true, date: true, location: true, createdById: true } },
    },
  });

  if (!order) {
    console.error(`❌ handleTicketPayment: order ${record.orderId} not found`);
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.paymentRecord.update({
      where: { id: record.id },
      data:  { status: "successful", flwRef: invoiceId },  // flwRef repurposed as gatewayRef
    });
    await tx.order.update({
      where: { id: order.id },
      data:  { status: "confirmed" },
    });
  });

  await creditWallet({
    ownerUserId:  order.event.createdById,
    grossAmount:  record.amount,
    description:  `Ticket sales — ${order.event.title}`,
    paymentTxRef: record.txRef,
  });

  const eventDate = new Date(order.event.date).toLocaleDateString("en-KE", {
    month: "long", day: "numeric", year: "numeric",
  });

  await sendTicketEmail({
    to:            order.email,
    name:          order.name,
    eventTitle:    order.event.title,
    eventDate,
    eventLocation: order.event.location,
    items:         order.items.map((i) => ({
      ticketType: i.ticketType,
      quantity:   i.quantity,
      price:      i.price,
      ticketCode: i.ticketCode,
    })),
    totalAmount: order.totalAmount,
    isRsvp:      false,
    orderId:     order.id,
    baseUrl,
  });

  const smsText = `Hi ${order.name}! Tickets for ${order.event.title} (${eventDate}) confirmed. KES ${order.totalAmount.toLocaleString()} paid. View: ${baseUrl}/ticket/${order.items[0]?.ticketCode}`;
  await sendSMS(order.phone, smsText);

  console.log(`✅ Ticket payment confirmed: order=${order.id} invoice=${invoiceId}`);
}

// ─── Vending slot payment confirmed ──────────────────────────────────────────

async function handleVendingPayment(
  record: { id: string; slotApplicationId: string | null; txRef: string; amount: number },
  invoiceId: string,
  baseUrl: string
) {
  const application = await prisma.slotApplication.findUnique({
    where:   { id: record.slotApplicationId! },
    include: {
      slot: {
        include: {
          event: {
            select: { title: true, date: true, location: true, createdById: true },
          },
        },
      },
    },
  });

  if (!application) {
    console.error(`❌ handleVendingPayment: application ${record.slotApplicationId} not found`);
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.paymentRecord.update({
      where: { id: record.id },
      data:  { status: "successful", flwRef: invoiceId },
    });

    await tx.slotApplication.update({
      where: { id: application.id },
      data:  { status: "confirmed" },
    });

    const slot = await tx.vendingSlot.findUnique({
      where:  { id: application.slotId },
      select: { totalSlots: true, id: true },
    });
    if (slot) {
      const confirmedCount = await tx.slotApplication.count({
        where: { slotId: slot.id, status: "confirmed" },
      });
      if (confirmedCount >= slot.totalSlots) {
        await tx.vendingSlot.update({
          where: { id: slot.id },
          data:  { status: "closed" },
        });
      }
    }
  });

  await creditWallet({
    ownerUserId:  application.slot.event.createdById,
    grossAmount:  record.amount,
    description:  `Vending slot — ${application.slot.title} @ ${application.slot.event.title}`,
    paymentTxRef: record.txRef,
  });

  const eventDate = new Date(application.slot.event.date).toLocaleDateString("en-KE", {
    month: "long", day: "numeric", year: "numeric",
  });

  await sendVendingConfirmationEmail({
    to:            application.contactEmail,
    name:          application.contactName,
    eventTitle:    application.slot.event.title,
    eventDate,
    eventLocation: application.slot.event.location,
    slotTitle:     application.slot.title,
    amount:        record.amount,
    applicationId: application.id,
    baseUrl,
  });

  const smsText = `Hi ${application.contactName}! Vending slot (${application.slot.title}) at ${application.slot.event.title} on ${eventDate} confirmed. KES ${record.amount.toLocaleString()} paid. Ref: ${application.id.slice(0, 8).toUpperCase()}`;
  await sendSMS(application.contactPhone, smsText);

  console.log(`✅ Vending payment confirmed: application=${application.id} invoice=${invoiceId}`);
}