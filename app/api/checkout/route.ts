// app/api/checkout/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomUUID }   from "crypto";
import prisma           from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { assertStkPushConfigured, initiateStkPush } from "@/lib/daraja";
import { sendSMS } from "@/lib/notifications";
import { sendTicketEmailForOrder } from "@/lib/ticket-email-delivery";
import { notifyTicketOrder } from "@/lib/createNotification";
import { resolveOrderOwnerId } from "@/lib/ticketOwnership";
import { normalizeMpesaPhone } from "@/lib/mpesaPhone";

const VALID_REFS = new Set(["whatsapp","instagram","twitter","facebook","tiktok","linkedin","telegram","direct","other"]);

function applyDiscount(price: number, discount: string): number {
  if (discount.endsWith("%")) {
    const percent = parseFloat(discount);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      throw new Error("Promo code has an invalid discount");
    }
    return price * (1 - percent / 100);
  }
  const flat = parseFloat(discount.replace(/[^0-9.]/g, "")) || 0;
  if (!Number.isFinite(flat) || flat < 0) throw new Error("Promo code has an invalid discount");
  return Math.max(0, price - flat);
}

function parseTicketPrice(price: string): number | null {
  const amount = Number(price.replace(/[^0-9.]/g, ""));
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}

function isValidDiscount(discount: string): boolean {
  if (discount.endsWith("%")) {
    const percent = parseFloat(discount);
    return Number.isFinite(percent) && percent >= 0 && percent <= 100;
  }
  const flat = parseFloat(discount.replace(/[^0-9.]/g, ""));
  return Number.isFinite(flat) && flat >= 0;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      eventId: eventIdValue, name, email, phone: phoneInput,
      tickets: cartItems, promoCode,
      ref: rawRef,           // ← referrer platform from checkout page
    } = body;

    const eventId = String(eventIdValue ?? "");
    const ref     = VALID_REFS.has(rawRef) ? rawRef : "direct";
    const phone = typeof phoneInput === "string" ? normalizeMpesaPhone(phoneInput) : null;

    if (
      !eventId ||
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      !phone ||
      !Array.isArray(cartItems) ||
      cartItems.length === 0 ||
      cartItems.length > 50 ||
      name.length > 160 ||
      email.length > 254
    ) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const event = await prisma.event.findUnique({
      where:  { id: eventId },
      select: { title: true, date: true, location: true, time: true, attendees: true, createdById: true },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const session = await getServerSession(authOptions);
    const accountUserId = await resolveOrderOwnerId(session?.user?.email, (email) =>
      prisma.user.findUnique({ where: { email }, select: { id: true } }),
    );

    const requestedItems = cartItems.map((item: unknown) => {
      if (!item || typeof item !== "object") return null;
      const candidate = item as { ticketId?: unknown; quantity?: unknown };
      const ticketId = typeof candidate.ticketId === "string" ? candidate.ticketId : "";
      const quantity = Number(candidate.quantity);
      return ticketId && Number.isSafeInteger(quantity) && quantity > 0 && quantity <= 100
        ? { ticketId, quantity }
        : null;
    });
    const validRequestedItems = requestedItems.filter(
      (item): item is { ticketId: string; quantity: number } => item !== null,
    );
    if (validRequestedItems.length !== requestedItems.length) {
      return NextResponse.json({ error: "Invalid ticket selection" }, { status: 400 });
    }
    const ticketIds = [...new Set(validRequestedItems.map((item) => item.ticketId))];
    const dbTickets = await prisma.ticket.findMany({
      where: { id: { in: ticketIds }, eventId, isActive: true },
    });
    if (dbTickets.length !== ticketIds.length) {
      return NextResponse.json({ error: "One or more tickets are unavailable for this event" }, { status: 400 });
    }
    const ticketById = new Map(dbTickets.map((ticket) => [ticket.id, ticket]));
    const purchaseItems = validRequestedItems.map((item) => {
      const ticket = ticketById.get(item.ticketId)!;
      return { ...item, ticketType: ticket.type, price: parseTicketPrice(ticket.price) };
    });
    if (purchaseItems.some((item) => item.price === null)) {
      return NextResponse.json({ error: "Ticket price is invalid; contact the event organiser" }, { status: 400 });
    }
    const ticketStates = new Set(purchaseItems.map((item) => item.ticketType === "RSVP"));
    if (ticketStates.size !== 1) {
      return NextResponse.json({ error: "Free RSVP and paid tickets must be checked out separately" }, { status: 400 });
    }
    const isRsvp = ticketStates.has(true);
    const now = new Date();
    if (dbTickets.some((ticket) =>
      (ticket.startsAt && ticket.startsAt > now) || (ticket.endsAt && ticket.endsAt <= now)
    )) {
      return NextResponse.json({ error: "One or more tickets are not currently on sale" }, { status: 409 });
    }

    if (isRsvp) {
      const existing = await prisma.order.findFirst({
        where: { eventId, email: email.trim().toLowerCase() },
      });
      if (existing) {
        return NextResponse.json({ error: "You have already RSVP'd for this event." }, { status: 409 });
      }
    }

    let promoRecord: { id: string; discount: string } | null = null;
    let discountLabel: string | null = null;

    if (typeof promoCode === "string" && promoCode.trim()) {
      promoRecord = await prisma.promoCode.findFirst({
        where: {
          eventId,
          code: promoCode.trim().toUpperCase(),
          active: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      });
      if (!promoRecord) {
        return NextResponse.json({ error: "Invalid or inactive promo code." }, { status: 400 });
      }
      const promoFull = await prisma.promoCode.findUnique({ where: { id: promoRecord.id } });
      if (promoFull && promoFull.uses >= promoFull.maxUses) {
        return NextResponse.json({ error: "This promo code has reached its usage limit." }, { status: 400 });
      }
      discountLabel = promoRecord.discount;
      if (!isValidDiscount(discountLabel)) {
        return NextResponse.json({ error: "This promo code has an invalid discount." }, { status: 400 });
      }
    }

    let totalAmount = 0;
    if (!isRsvp) {
      for (const item of purchaseItems) {
        const base = item.price!;
        const disc = promoRecord ? applyDiscount(base, promoRecord.discount) : base;
        totalAmount += disc * item.quantity;
      }
    }

    const orderId    = randomUUID();
    const orderItems = purchaseItems.map((item) => ({
      id:         randomUUID(),
      ticketId:   item.ticketId,
      ticketType: item.ticketType,
      price:      String(item.price),
      quantity:   item.quantity,
      ticketCode: randomUUID(),
    }));

    const baseUrl   = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const eventDate = new Date(event.date).toLocaleDateString("en-KE", {
      month: "long", day: "numeric", year: "numeric",
    });

    // ── RSVP / free ───────────────────────────────────────────────────────────
    if (isRsvp || totalAmount === 0) {
      await prisma.$transaction([
        prisma.order.create({
          data: {
            id:          orderId,
            eventId,
            email:       email.trim().toLowerCase(),
            phone:       phone.trim(),
            name:        name.trim(),
            promoCode:   promoCode?.trim().toUpperCase() || null,
            discount:    discountLabel,
            totalAmount: 0,
            isRsvp:      true,
            status:      "confirmed",
            userId:      accountUserId,
            ref,                       // ← store referrer
            items:       { create: orderItems },
          },
        }),
        ...(promoRecord ? [
          prisma.promoCode.update({ where: { id: promoRecord.id }, data: { uses: { increment: 1 } } }),
        ] : []),
        prisma.event.update({
          where: { id: eventId },
          data:  { attendees: { increment: validRequestedItems.reduce((sum, item) => sum + item.quantity, 0) } },
        }),
      ]);

      let ticketEmailSent = false;
      try {
        ticketEmailSent = await sendTicketEmailForOrder(orderId, baseUrl);
      } catch (error) {
        console.error("Unable to send RSVP ticket email; scheduled retry will handle delivery", {
          orderId,
          error,
        });
      }

      void sendSMS(phone.trim(),
        `Hi ${name.trim()}! Your RSVP for ${event.title} on ${eventDate} is confirmed. View your ticket: ${baseUrl}/ticket/${orderItems[0].ticketCode}`
      );

      notifyTicketOrder({
        ownerId: event.createdById ?? "", buyerName: name.trim(),
        eventTitle: event.title,
        quantity: validRequestedItems.reduce((sum, item) => sum + item.quantity, 0),
        ticketType: "RSVP", isRsvp: true,
      });

      return NextResponse.json({
        success: true, type: "rsvp", orderId, ticketEmailSent,
        ticketCodes: orderItems.map((item) => item.ticketCode),
        totalAmount: 0,
      });
    }

    if (!Number.isSafeInteger(totalAmount)) {
      return NextResponse.json({ error: "M-Pesa checkout requires a whole-KES total" }, { status: 400 });
    }

    const existingPendingOrder = await prisma.order.findFirst({
      where: {
        eventId,
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        isRsvp: false,
        status: "pending",
      },
      include: { paymentRecord: true, items: { select: { ticketId: true, quantity: true } } },
      orderBy: { createdAt: "desc" },
    });
    if (existingPendingOrder?.paymentRecord?.status === "pending") {
      const cartKey = (items: { ticketId: string; quantity: number }[]) =>
        items.map(({ ticketId, quantity }) => `${ticketId}:${quantity}`).sort().join("|");
      if (
        cartKey(existingPendingOrder.items) !== cartKey(validRequestedItems) ||
        existingPendingOrder.totalAmount !== totalAmount
      ) {
        return NextResponse.json({
          error: "You already have a pending payment for this event. Check its status before starting another order.",
        }, { status: 409 });
      }
      return NextResponse.json({
        success: true,
        type: "mpesa",
        txRef: existingPendingOrder.paymentRecord.txRef,
        orderId: existingPendingOrder.id,
        totalAmount: existingPendingOrder.totalAmount,
        message: "This order already has a pending M-Pesa payment. Check its status before trying again.",
      });
    }

    // ── Paid tickets ──────────────────────────────────────────────────────────
    assertStkPushConfigured();
    const txRef = randomUUID();

    await prisma.$transaction([
      prisma.order.create({
        data: {
          id:          orderId,
          eventId,
          email:       email.trim().toLowerCase(),
          phone:       phone.trim(),
          name:        name.trim(),
          promoCode:   promoCode?.trim().toUpperCase() || null,
          discount:    discountLabel,
          totalAmount,
          isRsvp:      false,
          status:      "pending",
          userId:      accountUserId,
          ref,                         // ← store referrer
          items:       { create: orderItems },
        },
      }),
      prisma.paymentRecord.create({
        data: { txRef, type: "ticket", amount: totalAmount, currency: "KES", phone: phone.trim(), status: "pending", orderId },
      }),
      ...(promoRecord ? [
        prisma.promoCode.update({ where: { id: promoRecord.id }, data: { uses: { increment: 1 } } }),
      ] : []),
      prisma.event.update({
        where: { id: eventId },
        data:  { attendees: { increment: validRequestedItems.reduce((sum, item) => sum + item.quantity, 0) } },
      }),
    ]);

    const nameParts = name.trim().split(" ");
    const firstName = nameParts[0] ?? name.trim();
    const lastName  = nameParts.slice(1).join(" ") || firstName;

    const stkResult = await initiateStkPush({
      phone: phone.trim(), amount: totalAmount, currency: "KES",
      apiRef: txRef, narrative: `Tickets — ${event.title}`,
      email: email.trim(), firstName, lastName,
    });

    if (!stkResult.success) {
      console.error("Daraja STK outcome is unknown; retaining the pending order for reconciliation", {
        paymentRef: txRef,
        error: stkResult.message,
      });
      return NextResponse.json({
        success: true,
        type: "mpesa",
        txRef,
        orderId,
        totalAmount,
        message: "Payment request is awaiting Daraja confirmation. Do not start another payment.",
      }, { status: 202 });
    }

    await prisma.paymentRecord.update({
      where: { txRef },
      data: {
        checkoutRequestId: stkResult.checkoutRequestId,
        merchantRequestId: stkResult.merchantRequestId,
      },
    });

    return NextResponse.json({
      success: true, type: "mpesa", txRef, orderId, totalAmount,
      message: "Check your phone and enter your M-Pesa PIN to complete payment.",
    });

  } catch (err: unknown) {
    console.error("❌ Checkout error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal server error" }, { status: 500 });
  }
}