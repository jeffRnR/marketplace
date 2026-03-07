// app/api/checkout/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Resend } from "resend";
import { randomUUID } from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

// ── Africa's Talking SMS ─────────────────────────────────────────────────
async function sendSMS(phone: string, message: string) {
  try {
    const username = process.env.AT_USERNAME!;
    const apiKey   = process.env.AT_API_KEY!;
    const from     = process.env.AT_SENDER_ID || "TIKETI";

    const res = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "apiKey":        apiKey,
        "Accept":        "application/json",
      },
      body: new URLSearchParams({ username, to: phone, message, from }).toString(),
    });
    const data = await res.json();
    console.log("SMS result:", JSON.stringify(data));
  } catch (err) {
    console.error("SMS failed (non-fatal):", err);
  }
}

// ── Resend email ─────────────────────────────────────────────────────────
async function sendTicketEmail({
  to, name, eventTitle, eventDate, eventLocation,
  items, totalAmount, isRsvp, orderId, baseUrl,
}: {
  to: string; name: string; eventTitle: string; eventDate: string;
  eventLocation: string; items: { ticketType: string; quantity: number; price: string; ticketCode: string }[];
  totalAmount: number; isRsvp: boolean; orderId: string; baseUrl: string;
}) {
  const ticketRows = items.map((item) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #2d2d2d;">
        <strong style="color:#e2e8f0;">${item.ticketType}</strong><br/>
        <span style="color:#718096;font-size:13px;">Qty: ${item.quantity} · ${isRsvp ? "Free RSVP" : item.price}</span>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #2d2d2d;text-align:right;vertical-align:top;">
        <a href="${baseUrl}/ticket/${item.ticketCode}"
           style="background:#7c3aed;color:#fff;padding:6px 14px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;">
          View Ticket
        </a>
      </td>
    </tr>
  `).join("");

  const allTicketLinks = items.map((item) =>
    `<p style="margin:4px 0;"><a href="${baseUrl}/ticket/${item.ticketCode}" style="color:#a78bfa;">${baseUrl}/ticket/${item.ticketCode}</a></p>`
  ).join("");

  await resend.emails.send({
    from:    process.env.RESEND_FROM_EMAIL ?? "tickets@yourdomain.com",
    to,
    subject: `Your ticket for ${eventTitle} 🎟`,
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:system-ui,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid #2d2d4e;">
    <div style="background:linear-gradient(135deg,#4c1d95,#7c3aed);padding:32px;text-align:center;">
      <p style="color:#ddd6fe;font-size:13px;margin:0 0 8px;">YOUR TICKET</p>
      <h1 style="color:#fff;margin:0;font-size:26px;">${eventTitle}</h1>
    </div>
    <div style="padding:28px;">
      <p style="color:#a0aec0;margin:0 0 20px;">Hi <strong style="color:#e2e8f0;">${name}</strong>, your ${isRsvp ? "RSVP" : "order"} is confirmed!</p>

      <div style="background:#111827;border-radius:12px;padding:16px;margin-bottom:20px;">
        <p style="color:#718096;font-size:12px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;">Event Details</p>
        <p style="color:#e2e8f0;margin:4px 0;">📅 ${eventDate}</p>
        <p style="color:#e2e8f0;margin:4px 0;">📍 ${eventLocation}</p>
      </div>

      <p style="color:#718096;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">Your Tickets</p>
      <table style="width:100%;border-collapse:collapse;">${ticketRows}</table>

      ${!isRsvp ? `
      <div style="background:#111827;border-radius:12px;padding:16px;margin-top:20px;text-align:right;">
        <span style="color:#718096;">Total paid: </span>
        <strong style="color:#68d391;font-size:18px;">KES ${totalAmount.toLocaleString()}</strong>
      </div>` : ""}

      <div style="margin-top:24px;padding-top:20px;border-top:1px solid #2d2d2d;">
        <p style="color:#718096;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">Ticket Links</p>
        ${allTicketLinks}
      </div>

      <p style="color:#4a5568;font-size:12px;margin-top:24px;text-align:center;">
        Present your ticket QR code at the entrance.<br/>Order ID: ${orderId}
      </p>
    </div>
  </div>
</body>
</html>`,
  });
}

// ── Parse discount ───────────────────────────────────────────────────────
function applyDiscount(price: number, discount: string): number {
  if (discount.endsWith("%")) {
    const pct = parseFloat(discount) / 100;
    return price * (1 - pct);
  }
  // "KES 500"
  const flat = parseFloat(discount.replace(/[^0-9.]/g, "")) || 0;
  return Math.max(0, price - flat);
}

// ── POST /api/checkout ───────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { eventId, name, email, phone, tickets: cartItems, promoCode } = body;
    // cartItems: { ticketId: number, ticketType: string, price: string, quantity: number }[]

    if (!eventId || !name?.trim() || !email?.trim() || !phone?.trim() || !cartItems?.length)
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    // Load event
    const event = await prisma.event.findUnique({
      where: { id: Number(eventId) },
      select: { title: true, date: true, location: true, attendees: true, time: true },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    // Load tickets to verify capacity
    const ticketIds = cartItems.map((i: any) => Number(i.ticketId));
    const dbTickets = await prisma.ticket.findMany({ where: { id: { in: ticketIds } } });

    const isRsvp = dbTickets.every((t) => t.type === "RSVP");

    // RSVP: one per person — check by email
    if (isRsvp) {
      const existing = await prisma.order.findFirst({
        where: { eventId: Number(eventId), email: email.trim().toLowerCase() },
      });
      if (existing)
        return NextResponse.json({ error: "You have already RSVP'd for this event." }, { status: 409 });
    }

    // Validate & resolve promo code
    let promoRecord: { id: string; discount: string } | null = null;
    let discountLabel: string | null = null;

    if (promoCode?.trim()) {
      promoRecord = await prisma.promoCode.findFirst({
        where: {
          eventId: Number(eventId),
          code:    promoCode.trim().toUpperCase(),
          active:  true,
        },
      });
      if (!promoRecord)
        return NextResponse.json({ error: "Invalid or inactive promo code." }, { status: 400 });
      if (promoRecord) {
        const promoFull = await prisma.promoCode.findUnique({ where: { id: promoRecord.id } });
        if (promoFull && promoFull.uses >= promoFull.maxUses)
          return NextResponse.json({ error: "This promo code has reached its usage limit." }, { status: 400 });
        discountLabel = promoRecord.discount;
      }
    }

    // Calculate total
    let totalAmount = 0;
    if (!isRsvp) {
      for (const item of cartItems) {
        const basePrice = parseFloat(String(item.price).replace(/[^0-9.]/g, "")) || 0;
        const discounted = promoRecord ? applyDiscount(basePrice, promoRecord.discount) : basePrice;
        totalAmount += discounted * item.quantity;
      }
    }

    // Create order + items in a transaction
    const orderId = randomUUID();
    const orderItems = cartItems.map((item: any) => ({
      id:         randomUUID(),
      orderId,
      ticketId:   Number(item.ticketId),
      ticketType: item.ticketType,
      price:      item.price,
      quantity:   item.quantity,
      ticketCode: randomUUID(),
    }));

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
          isRsvp,
          status:      "confirmed",
          items: { create: orderItems.map(({ orderId: _oid, ...rest }: any) => rest) },
        },
      }),
      // Increment promo usage
      ...(promoRecord ? [
        prisma.promoCode.update({ where: { id: promoRecord.id }, data: { uses: { increment: 1 } } }),
      ] : []),
      // Increment attendees count on event
      prisma.event.update({
        where: { id: Number(eventId) },
        data:  { attendees: { increment: cartItems.reduce((s: number, i: any) => s + i.quantity, 0) } },
      }),
    ]);

    const baseUrl  = process.env.NEXT_PUBLIC_BASE_URL ?? "https://yourapp.com";
    const eventDate = new Date(event.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

    // Send email
    await sendTicketEmail({
      to: email.trim(), name: name.trim(),
      eventTitle: event.title, eventDate, eventLocation: event.location,
      items: orderItems.map((oi: any) => ({
        ticketType: oi.ticketType, quantity: oi.quantity,
        price: oi.price, ticketCode: oi.ticketCode,
      })),
      totalAmount, isRsvp, orderId, baseUrl,
    });

    // Send SMS
    const smsMessage = isRsvp
      ? `Hi ${name.trim()}! Your RSVP for ${event.title} on ${eventDate} is confirmed. View your ticket: ${baseUrl}/ticket/${orderItems[0].ticketCode}`
      : `Hi ${name.trim()}! Your tickets for ${event.title} (${eventDate}) are confirmed. Total: KES ${totalAmount.toLocaleString()}. View: ${baseUrl}/ticket/${orderItems[0].ticketCode}`;
    await sendSMS(phone.trim(), smsMessage);

    return NextResponse.json({
      success: true,
      orderId,
      ticketCodes: orderItems.map((i: any) => i.ticketCode),
      totalAmount,
    });
  } catch (err: any) {
    console.error("Checkout error:", err);
    return NextResponse.json({ error: err.message ?? "Internal server error" }, { status: 500 });
  }
}