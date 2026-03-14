// app/api/checkout/route.ts
// POST /api/checkout
//
// RSVP / free tickets:  confirms order immediately (unchanged behaviour)
// Paid tickets:         creates order with status="pending", initiates
//                       Flutterwave M-Pesa STK push, returns txRef for polling.
//
// The checkout page polls GET /api/payment/status?txRef=... until "successful".
// The webhook (app/api/payment/webhook) confirms the order and sends notifications.

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { initiateStkPush } from "@/lib/intasend";
import { sendTicketEmail, sendSMS } from "@/lib/notifications";

// ── Parse discount ───────────────────────────────────────────────────────────

function applyDiscount(price: number, discount: string): number {
  if (discount.endsWith("%")) return price * (1 - parseFloat(discount) / 100);
  const flat = parseFloat(discount.replace(/[^0-9.]/g, "")) || 0;
  return Math.max(0, price - flat);
}

// ── POST /api/checkout ────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { eventId, name, email, phone, tickets: cartItems, promoCode } = body;

    if (
      !eventId ||
      !name?.trim() ||
      !email?.trim() ||
      !phone?.trim() ||
      !cartItems?.length
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const event = await prisma.event.findUnique({
      where: { id: Number(eventId) },
      select: {
        title: true,
        date: true,
        location: true,
        time: true,
        attendees: true,
      },
    });
    if (!event)
      return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const ticketIds = cartItems.map((i: any) => Number(i.ticketId));
    const dbTickets = await prisma.ticket.findMany({
      where: { id: { in: ticketIds } },
    });
    const isRsvp = dbTickets.every((t) => t.type === "RSVP");

    // Prevent duplicate RSVP
    if (isRsvp) {
      const existing = await prisma.order.findFirst({
        where: { eventId: Number(eventId), email: email.trim().toLowerCase() },
      });
      if (existing) {
        return NextResponse.json(
          { error: "You have already RSVP'd for this event." },
          { status: 409 },
        );
      }
    }

    // Validate promo code
    let promoRecord: { id: string; discount: string } | null = null;
    let discountLabel: string | null = null;

    if (promoCode?.trim()) {
      promoRecord = await prisma.promoCode.findFirst({
        where: {
          eventId: Number(eventId),
          code: promoCode.trim().toUpperCase(),
          active: true,
        },
      });
      if (!promoRecord) {
        return NextResponse.json(
          { error: "Invalid or inactive promo code." },
          { status: 400 },
        );
      }
      const promoFull = await prisma.promoCode.findUnique({
        where: { id: promoRecord.id },
      });
      if (promoFull && promoFull.uses >= promoFull.maxUses) {
        return NextResponse.json(
          { error: "This promo code has reached its usage limit." },
          { status: 400 },
        );
      }
      discountLabel = promoRecord.discount;
    }

    // Calculate total
    let totalAmount = 0;
    if (!isRsvp) {
      for (const item of cartItems) {
        const base =
          parseFloat(String(item.price).replace(/[^0-9.]/g, "")) || 0;
        const disc = promoRecord
          ? applyDiscount(base, promoRecord.discount)
          : base;
        totalAmount += disc * item.quantity;
      }
    }

    const orderId = randomUUID();
    const orderItems = cartItems.map((item: any) => ({
      id: randomUUID(),
      ticketId: Number(item.ticketId),
      ticketType: item.ticketType,
      price: item.price,
      quantity: item.quantity,
      ticketCode: randomUUID(),
    }));

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const eventDate = new Date(event.date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    // ── RSVP / free: confirm immediately ──────────────────────────────────────
    if (isRsvp || totalAmount === 0) {
      await prisma.$transaction([
        prisma.order.create({
          data: {
            id: orderId,
            eventId: Number(eventId),
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
            name: name.trim(),
            promoCode: promoCode?.trim().toUpperCase() || null,
            discount: discountLabel,
            totalAmount: 0,
            isRsvp: true,
            status: "confirmed",
            items: { create: orderItems },
          },
        }),
        ...(promoRecord
          ? [
              prisma.promoCode.update({
                where: { id: promoRecord.id },
                data: { uses: { increment: 1 } },
              }),
            ]
          : []),
        prisma.event.update({
          where: { id: Number(eventId) },
          data: {
            attendees: {
              increment: cartItems.reduce(
                (s: number, i: any) => s + i.quantity,
                0,
              ),
            },
          },
        }),
      ]);

      await sendTicketEmail({
        to: email.trim(),
        name: name.trim(),
        eventTitle: event.title,
        eventDate,
        eventLocation: event.location,
        items: orderItems.map((oi: any) => ({
          ticketType: oi.ticketType,
          quantity: oi.quantity,
          price: oi.price,
          ticketCode: oi.ticketCode,
        })),
        totalAmount: 0,
        isRsvp: true,
        orderId,
        baseUrl,
      });

      const smsText = `Hi ${name.trim()}! Your RSVP for ${event.title} on ${eventDate} is confirmed. View your ticket: ${baseUrl}/ticket/${orderItems[0].ticketCode}`;
      await sendSMS(phone.trim(), smsText);

      return NextResponse.json({
        success: true,
        type: "rsvp",
        orderId,
        ticketCodes: orderItems.map((i: any) => i.ticketCode),
        totalAmount: 0,
      });
    }

    // ── Paid tickets: create pending order + initiate STK push ───────────────
    const txRef = randomUUID();

    // Create order as "pending" + PaymentRecord atomically
    await prisma.$transaction([
      prisma.order.create({
        data: {
          id: orderId,
          eventId: Number(eventId),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          name: name.trim(),
          promoCode: promoCode?.trim().toUpperCase() || null,
          discount: discountLabel,
          totalAmount,
          isRsvp: false,
          status: "pending",
          items: { create: orderItems },
        },
      }),
      prisma.paymentRecord.create({
        data: {
          txRef,
          type: "ticket",
          amount: totalAmount,
          currency: "KES",
          phone: phone.trim(),
          status: "pending",
          orderId,
        },
      }),
      ...(promoRecord
        ? [
            prisma.promoCode.update({
              where: { id: promoRecord.id },
              data: { uses: { increment: 1 } },
            }),
          ]
        : []),
      // Increment attendees optimistically — webhook will not double-count
      prisma.event.update({
        where: { id: Number(eventId) },
        data: {
          attendees: {
            increment: cartItems.reduce(
              (s: number, i: any) => s + i.quantity,
              0,
            ),
          },
        },
      }),
    ]);

    // Initiate STK push
    const nameParts = name.trim().split(" ");
    const firstName = nameParts[0] ?? name.trim();
    const lastName = nameParts.slice(1).join(" ") || firstName;

    const stkResult = await initiateStkPush({
      phone: phone.trim(),
      amount: totalAmount,
      currency: "KES",
      apiRef: txRef,
      narrative: `Tickets — ${event.title}`,
      email: email.trim(),
      firstName,
      lastName,
    });

    if (!stkResult.success) {
      // Mark payment as failed so the user can retry
      await prisma.paymentRecord.update({
        where: {
          id: (await prisma.paymentRecord.findUnique({
            where: { txRef },
            select: { id: true },
          }))!.id,
        },
        data: { status: "failed" },
      });
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "failed" },
      });

      return NextResponse.json(
        { error: `Could not initiate payment: ${stkResult.message}` },
        { status: 502 },
      );
    }

    // Return txRef — frontend polls /api/payment/status?txRef=...
    return NextResponse.json({
      success: true,
      type: "mpesa",
      txRef,
      orderId,
      totalAmount,
      message:
        "Check your phone and enter your M-Pesa PIN to complete payment.",
    });
  } catch (err: any) {
    console.error("❌ Checkout error:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 },
    );
  }
}
