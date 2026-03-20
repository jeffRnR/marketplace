// app/api/checkout/route.ts
// POST /api/checkout
//
// RSVP / free tickets:  confirms immediately (unchanged)
// Paid tickets:         creates pending order, initiates IntaSend M-Pesa STK push,
//                       returns { type: "mpesa", txRef } for polling

import { NextResponse } from "next/server";
import { randomUUID }   from "crypto";
import prisma           from "@/lib/prisma";
import { initiateStkPush } from "@/lib/intasend";
import { sendTicketEmail, sendSMS } from "@/lib/notifications";
import { notifyTicketOrder } from "@/lib/createNotification";

function applyDiscount(price: number, discount: string): number {
  if (discount.endsWith("%")) return price * (1 - parseFloat(discount) / 100);
  const flat = parseFloat(discount.replace(/[^0-9.]/g, "")) || 0;
  return Math.max(0, price - flat);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { eventId, name, email, phone, tickets: cartItems, promoCode } = body;

    if (!eventId || !name?.trim() || !email?.trim() || !phone?.trim() || !cartItems?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const event = await prisma.event.findUnique({
      where:  { id: Number(eventId) },
      select: { title: true, date: true, location: true, time: true, attendees: true, createdById: true },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const ticketIds = cartItems.map((i: any) => Number(i.ticketId));
    const dbTickets = await prisma.ticket.findMany({ where: { id: { in: ticketIds } } });
    const isRsvp    = dbTickets.every((t) => t.type === "RSVP");

    if (isRsvp) {
      const existing = await prisma.order.findFirst({
        where: { eventId: Number(eventId), email: email.trim().toLowerCase() },
      });
      if (existing) {
        return NextResponse.json({ error: "You have already RSVP'd for this event." }, { status: 409 });
      }
    }

    let promoRecord: { id: string; discount: string } | null = null;
    let discountLabel: string | null = null;

    if (promoCode?.trim()) {
      promoRecord = await prisma.promoCode.findFirst({
        where: { eventId: Number(eventId), code: promoCode.trim().toUpperCase(), active: true },
      });
      if (!promoRecord) {
        return NextResponse.json({ error: "Invalid or inactive promo code." }, { status: 400 });
      }
      const promoFull = await prisma.promoCode.findUnique({ where: { id: promoRecord.id } });
      if (promoFull && promoFull.uses >= promoFull.maxUses) {
        return NextResponse.json({ error: "This promo code has reached its usage limit." }, { status: 400 });
      }
      discountLabel = promoRecord.discount;
    }

    let totalAmount = 0;
    if (!isRsvp) {
      for (const item of cartItems) {
        const base = parseFloat(String(item.price).replace(/[^0-9.]/g, "")) || 0;
        const disc = promoRecord ? applyDiscount(base, promoRecord.discount) : base;
        totalAmount += disc * item.quantity;
      }
    }

    const orderId    = randomUUID();
    const orderItems = cartItems.map((item: any) => ({
      id:         randomUUID(),
      ticketId:   Number(item.ticketId),
      ticketType: item.ticketType,
      price:      item.price,
      quantity:   item.quantity,
      ticketCode: randomUUID(),
    }));

    const baseUrl   = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const eventDate = new Date(event.date).toLocaleDateString("en-KE", {
      month: "long", day: "numeric", year: "numeric",
    });

    // ── RSVP / free: confirm immediately ──────────────────────────────────────
    if (isRsvp || totalAmount === 0) {
      await prisma.$transaction([
        prisma.order.create({
          data: {
            id:          orderId,
            eventId:     Number(eventId),
            email:       email.trim().toLowerCase(),
            phone:       phone.trim(),
            name:        name.trim(),
            promoCode:   promoCode?.trim().toUpperCase() || null,
            discount:    discountLabel,
            totalAmount: 0,
            isRsvp:      true,
            status:      "confirmed",
            items:       { create: orderItems },
          },
        }),
        ...(promoRecord ? [
          prisma.promoCode.update({ where: { id: promoRecord.id }, data: { uses: { increment: 1 } } }),
        ] : []),
        prisma.event.update({
          where: { id: Number(eventId) },
          data:  { attendees: { increment: cartItems.reduce((s: number, i: any) => s + i.quantity, 0) } },
        }),
      ]);

      await sendTicketEmail({
        to: email.trim(), name: name.trim(),
        eventTitle: event.title, eventDate, eventLocation: event.location,
        items: orderItems.map((oi: any) => ({
          ticketType: oi.ticketType, quantity: oi.quantity,
          price: oi.price, ticketCode: oi.ticketCode,
        })),
        totalAmount: 0, isRsvp: true, orderId, baseUrl,
      });

      const smsText = `Hi ${name.trim()}! Your RSVP for ${event.title} on ${eventDate} is confirmed. View your ticket: ${baseUrl}/ticket/${orderItems[0].ticketCode}`;
      await sendSMS(phone.trim(), smsText);

      // In-app notification for event owner
      notifyTicketOrder({
        ownerId:    event.createdById ?? "",
        buyerName:  name.trim(),
        eventTitle: event.title,
        quantity:   cartItems.reduce((s: number, i: any) => s + i.quantity, 0),
        ticketType: "RSVP",
        isRsvp:     true,
      });

      return NextResponse.json({
        success:     true,
        type:        "rsvp",
        orderId,
        ticketCodes: orderItems.map((i: any) => i.ticketCode),
        totalAmount: 0,
      });
    }

    // ── Paid tickets: create pending order + IntaSend STK push ────────────────
    const txRef = randomUUID();

    await prisma.$transaction([
      prisma.order.create({
        data: {
          id:          orderId,
          eventId:     Number(eventId),
          email:       email.trim().toLowerCase(),
          phone:       phone.trim(),
          name:        name.trim(),
          promoCode:   promoCode?.trim().toUpperCase() || null,
          discount:    discountLabel,
          totalAmount,
          isRsvp:      false,
          status:      "pending",
          items:       { create: orderItems },
        },
      }),
      prisma.paymentRecord.create({
        data: {
          txRef,
          type:     "ticket",
          amount:   totalAmount,
          currency: "KES",
          phone:    phone.trim(),
          status:   "pending",
          orderId,
        },
      }),
      ...(promoRecord ? [
        prisma.promoCode.update({ where: { id: promoRecord.id }, data: { uses: { increment: 1 } } }),
      ] : []),
      prisma.event.update({
        where: { id: Number(eventId) },
        data:  { attendees: { increment: cartItems.reduce((s: number, i: any) => s + i.quantity, 0) } },
      }),
    ]);

    // Parse name into first/last for IntaSend
    const nameParts = name.trim().split(" ");
    const firstName = nameParts[0] ?? name.trim();
    const lastName  = nameParts.slice(1).join(" ") || firstName;

    const stkResult = await initiateStkPush({
      phone:     phone.trim(),
      amount:    totalAmount,
      currency:  "KES",
      apiRef:    txRef,
      narrative: `Tickets — ${event.title}`,
      email:     email.trim(),
      firstName,
      lastName,
    });

    if (!stkResult.success) {
      // Mark as failed so the user can retry
      await prisma.$transaction([
        prisma.paymentRecord.update({ where: { txRef }, data: { status: "failed" } }),
        prisma.order.update({ where: { id: orderId }, data: { status: "failed" } }),
      ]);
      return NextResponse.json(
        { error: `Could not initiate M-Pesa payment: ${stkResult.message}` },
        { status: 502 }
      );
    }

    // Optionally store IntaSend's invoice_id for faster status lookups
    if (stkResult.invoiceId) {
      await prisma.paymentRecord.update({
        where: { txRef },
        data:  { flwRef: stkResult.invoiceId },  // flwRef repurposed as gatewayInvoiceId
      });
    }

    return NextResponse.json({
      success:     true,
      type:        "mpesa",
      txRef,
      orderId,
      totalAmount,
      message:     "Check your phone and enter your M-Pesa PIN to complete payment.",
    });

  } catch (err: any) {
    console.error("❌ Checkout error:", err);
    return NextResponse.json({ error: err.message ?? "Internal server error" }, { status: 500 });
  }
}