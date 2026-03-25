// app/api/marketplace/bookings/route.ts
// GET   — vendor fetches their bookings
// POST  — buyer creates a booking request
// PATCH — vendor approves/rejects OR triggers payment OR marks offline confirmed
//       — buyer cancels

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { initiateStkPush } from "@/lib/intasend";
import { sendBookingEmail } from "@/lib/notifications";
import {
  notifyBookingRequest,
  notifyBookingApproved,
  notifyBookingRejected,
  notifyBookingConfirmed,
} from "@/lib/createNotification";

async function getUser(email: string) {
  return prisma.user.findUnique({
    where:  { email },
    select: { id: true, name: true, email: true, marketProfile: { select: { id: true, userId: true } } },
  });
}

// ── GET — fetch vendor's bookings ────────────────────────────────────────────

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getUser(session.user.email);
  if (!user?.marketProfile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const bookings = await prisma.serviceBooking.findMany({
    where: {
      listing: {
        profile: {
          userId: user.id
        }
      }
    },
    include: {
      listing: {
        select: { id: true, title: true, price: true, priceType: true }
      },
      conversation: {
        select: {
          id: true,
          buyer: {
            select: { id: true, name: true, email: true }
          },
          vendorProfile: {
            select: { id: true, businessName: true, logoImage: true, userId: true }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ bookings });
}

// ── POST — create booking ─────────────────────────────────────────────────────

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getUser(session.user.email);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { conversationId, listingId, eventDate, quantity, notes, paymentMethod } = body;

  if (!conversationId || !listingId) {
    return NextResponse.json({ error: "conversationId and listingId required" }, { status: 400 });
  }

  const listing = await prisma.marketListing.findUnique({
    where:  { id: listingId },
    select: { price: true, currency: true, title: true, profile: { select: { userId: true, businessName: true, user: { select: { email: true } } } } },
  });
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  // Prevent vendor booking their own listing
  if (listing.profile.userId === user.id) {
    return NextResponse.json({ error: "You cannot book your own listing." }, { status: 403 });
  }

  const qty         = Math.max(1, Number(quantity) || 1);
  const totalAmount = (listing.price ?? 0) * qty;

  const booking = await prisma.serviceBooking.create({
    data: {
      conversationId,
      listingId,
      eventDate:     eventDate ? new Date(eventDate) : null,
      quantity:      qty,
      notes:         notes?.trim() || null,
      totalAmount,
      currency:      listing.currency,
      paymentMethod: paymentMethod ?? "mpesa",
      status:        "pending",
    },
  });

  // Notify both parties
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:4000";
  await sendBookingEmail({
    to:           listing.profile.user.email,
    subject:      `New booking request — ${listing.title}`,
    name:         listing.profile.businessName,
    body:         `${user.name ?? user.email} has requested to book "${listing.title}". Review and approve in your Messages dashboard.`,
    ctaUrl:       `${baseUrl}/messages`,
    ctaLabel:     "View booking",
  });

  // In-app notification for vendor
  notifyBookingRequest({
    vendorUserId: listing.profile.userId,
    buyerName:    user.name ?? user.email,
    listingTitle: listing.title,
    amount:       totalAmount,
  });

  return NextResponse.json({ booking }, { status: 201 });
}

// ── PATCH — update booking status ─────────────────────────────────────────────

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getUser(session.user.email);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { bookingId, action, vendorNote, phone } = body;

  if (!bookingId || !action) {
    return NextResponse.json({ error: "bookingId and action required" }, { status: 400 });
  }

  const booking = await prisma.serviceBooking.findUnique({
    where:   { id: bookingId },
    include: {
      listing: { select: { title: true, profile: { select: { userId: true, businessName: true, user: { select: { email: true, name: true } } } } } },
      conversation: { select: { buyerId: true, buyer: { select: { email: true, name: true } } } },
    },
  });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const isVendor = booking.listing.profile.userId === user.id;
  const isBuyer  = booking.conversation.buyerId  === user.id;
  const baseUrl  = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:4000";

  // ── Vendor: approve ───────────────────────────────────────────────────────
  if (action === "approve") {
    if (!isVendor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (booking.status !== "pending") return NextResponse.json({ error: "Can only approve pending bookings" }, { status: 409 });

    const updated = await prisma.serviceBooking.update({
      where: { id: bookingId },
      data:  { status: "approved", vendorNote: vendorNote?.trim() ?? null },
    });

    await sendBookingEmail({
      to:       booking.conversation.buyer.email,
      subject:  `Booking approved — ${booking.listing.title}`,
      name:     booking.conversation.buyer.name ?? "there",
      body:     `Your booking request for "${booking.listing.title}" has been approved by ${booking.listing.profile.businessName}. ${booking.paymentMethod === "offline" ? "Please arrange payment directly with the vendor." : "Click below to complete payment via M-Pesa."}`,
      ctaUrl:   `${baseUrl}/messages`,
      ctaLabel: "View booking",
    });

    notifyBookingApproved({
      buyerUserId:  booking.conversation.buyerId,
      listingTitle: booking.listing.title,
      vendorName:   booking.listing.profile.businessName,
    });

    return NextResponse.json({ booking: updated });
  }

  // ── Vendor: reject ────────────────────────────────────────────────────────
  if (action === "reject") {
    if (!isVendor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!["pending","approved"].includes(booking.status)) {
      return NextResponse.json({ error: "Cannot reject this booking" }, { status: 409 });
    }

    const updated = await prisma.serviceBooking.update({
      where: { id: bookingId },
      data:  { status: "rejected", vendorNote: vendorNote?.trim() ?? null },
    });

    await sendBookingEmail({
      to:       booking.conversation.buyer.email,
      subject:  `Booking update — ${booking.listing.title}`,
      name:     booking.conversation.buyer.name ?? "there",
      body:     `Your booking for "${booking.listing.title}" was not approved.${vendorNote ? ` Vendor note: ${vendorNote}` : ""}`,
      ctaUrl:   `${baseUrl}/messages`,
      ctaLabel: "View details",
    });

    notifyBookingRejected({
      buyerUserId:  booking.conversation.buyerId,
      listingTitle: booking.listing.title,
      vendorName:   booking.listing.profile.businessName,
    });

    return NextResponse.json({ booking: updated });
  }

  // ── Buyer: pay via M-Pesa ─────────────────────────────────────────────────
  if (action === "pay") {
    if (!isBuyer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (booking.status !== "approved") {
      return NextResponse.json({ error: "Booking must be approved before payment" }, { status: 409 });
    }
    if (booking.paymentMethod !== "mpesa") {
      return NextResponse.json({ error: "This booking uses offline payment" }, { status: 400 });
    }

    const payPhone = phone?.trim() ?? "";
    if (!payPhone) return NextResponse.json({ error: "phone required for M-Pesa payment" }, { status: 400 });

    const txRef = randomUUID();

    await prisma.paymentRecord.create({
      data: {
        txRef,
        type:            "service_booking",
        amount:          booking.totalAmount,
        currency:        booking.currency,
        phone:           payPhone,
        status:          "pending",
        serviceBookingId: bookingId,
      },
    });

    const nameParts = (user.name ?? "").trim().split(" ");
    const stkResult = await initiateStkPush({
      phone:     payPhone,
      amount:    booking.totalAmount,
      currency:  booking.currency,
      apiRef:    txRef,
      narrative: `Booking — ${booking.listing.title}`,
      email:     user.email,
      firstName: nameParts[0] ?? user.email,
      lastName:  (nameParts.slice(1).join(" ") || nameParts[0]) ?? user.email,
    });

    if (!stkResult.success) {
      await prisma.paymentRecord.update({ where: { txRef }, data: { status: "failed" } });
      return NextResponse.json({ error: `Payment failed: ${stkResult.message}` }, { status: 502 });
    }

    if (stkResult.invoiceId) {
      await prisma.paymentRecord.update({ where: { txRef }, data: { flwRef: stkResult.invoiceId } });
    }

    await prisma.serviceBooking.update({ where: { id: bookingId }, data: { status: "paid" } });

    return NextResponse.json({ success: true, txRef, amount: booking.totalAmount });
  }

  // ── Vendor: confirm offline payment ───────────────────────────────────────
  if (action === "confirm_offline") {
    if (!isVendor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (booking.status !== "approved" || booking.paymentMethod !== "offline") {
      return NextResponse.json({ error: "Only approved offline bookings can be confirmed" }, { status: 409 });
    }

    const updated = await prisma.serviceBooking.update({
      where: { id: bookingId },
      data:  { status: "confirmed" },
    });

    await sendBookingEmail({
      to:       booking.conversation.buyer.email,
      subject:  `Booking confirmed — ${booking.listing.title}`,
      name:     booking.conversation.buyer.name ?? "there",
      body:     `Your booking for "${booking.listing.title}" with ${booking.listing.profile.businessName} has been confirmed!`,
      ctaUrl:   `${baseUrl}/messages`,
      ctaLabel: "View booking",
    });

    notifyBookingConfirmed({
      buyerUserId:  booking.conversation.buyerId,
      listingTitle: booking.listing.title,
      vendorName:   booking.listing.profile.businessName,
    });

    return NextResponse.json({ booking: updated });
  }

  // ── Buyer: cancel ─────────────────────────────────────────────────────────
  if (action === "cancel") {
    if (!isBuyer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (["confirmed","paid","rejected","cancelled"].includes(booking.status)) {
      return NextResponse.json({ error: "Cannot cancel this booking" }, { status: 409 });
    }

    const updated = await prisma.serviceBooking.update({
      where: { id: bookingId },
      data:  { status: "cancelled" },
    });

    return NextResponse.json({ booking: updated });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}