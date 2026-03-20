// lib/createNotification.ts
// Central helper — call anywhere to create an in-app notification.
// Always fire-and-forget, never throw — notifications must never break
// the main flow.
//
// Usage (no await needed):
//   createNotification({
//     userId:  eventOwnerId,
//     type:    "ticket_order",
//     title:   "New ticket order",
//     body:    "Jane Doe purchased 2 × VIP for Jazz Night",
//     linkUrl: "/my-events",
//   });

import prisma from "@/lib/prisma";

interface NotificationPayload {
  userId:   string;
  type:     string;
  title:    string;
  body:     string;
  linkUrl?: string;
}

export async function createNotification(payload: NotificationPayload): Promise<void> {
  try {
    await prisma.notification.create({ data: payload });
  } catch (err) {
    // Never let notification failure crash the caller
    console.error("⚠️  createNotification failed:", err);
  }
}

// ─── Typed helpers — one per notification type ────────────────────────────────

export function notifyTicketOrder(params: {
  ownerId: string; buyerName: string; eventTitle: string;
  quantity: number; ticketType: string; isRsvp: boolean;
}) {
  createNotification({
    userId:  params.ownerId,
    type:    params.isRsvp ? "rsvp" : "ticket_order",
    title:   params.isRsvp ? "New RSVP" : "New ticket order",
    body:    params.isRsvp
      ? `${params.buyerName} RSVP'd for ${params.eventTitle}`
      : `${params.buyerName} purchased ${params.quantity} × ${params.ticketType} for ${params.eventTitle}`,
    linkUrl: "/my-events",
  });
}

export function notifyVendingApplication(params: {
  ownerId: string; businessName: string; slotTitle: string; eventTitle: string; eventId: number;
}) {
  createNotification({
    userId:  params.ownerId,
    type:    "vending_application",
    title:   "New vending application",
    body:    `${params.businessName} applied for "${params.slotTitle}" at ${params.eventTitle}`,
    linkUrl: `/my-events`,
  });
}

export function notifyVendingConfirmed(params: {
  ownerId: string; businessName: string; slotTitle: string; eventTitle: string; amount: number;
}) {
  createNotification({
    userId:  params.ownerId,
    type:    "vending_confirmed",
    title:   "Vending slot booked",
    body:    `${params.businessName} paid for "${params.slotTitle}" at ${params.eventTitle} — KES ${params.amount.toLocaleString()} credited to your wallet`,
    linkUrl: "/vending/wallet",
  });
}

export function notifyBookingRequest(params: {
  vendorUserId: string; buyerName: string; listingTitle: string; amount: number;
}) {
  createNotification({
    userId:  params.vendorUserId,
    type:    "booking_request",
    title:   "New booking request",
    body:    `${params.buyerName} wants to book "${params.listingTitle}" — KES ${params.amount.toLocaleString()}`,
    linkUrl: "/messages",
  });
}

export function notifyBookingApproved(params: {
  buyerUserId: string; listingTitle: string; vendorName: string;
}) {
  createNotification({
    userId:  params.buyerUserId,
    type:    "booking_approved",
    title:   "Booking approved",
    body:    `${params.vendorName} approved your booking for "${params.listingTitle}"`,
    linkUrl: "/messages",
  });
}

export function notifyBookingRejected(params: {
  buyerUserId: string; listingTitle: string; vendorName: string;
}) {
  createNotification({
    userId:  params.buyerUserId,
    type:    "booking_rejected",
    title:   "Booking declined",
    body:    `${params.vendorName} declined your booking for "${params.listingTitle}"`,
    linkUrl: "/messages",
  });
}

export function notifyBookingConfirmed(params: {
  buyerUserId: string; listingTitle: string; vendorName: string;
}) {
  createNotification({
    userId:  params.buyerUserId,
    type:    "booking_confirmed",
    title:   "Booking confirmed",
    body:    `Your booking for "${params.listingTitle}" with ${params.vendorName} is confirmed`,
    linkUrl: "/messages",
  });
}

export function notifyNewMessage(params: {
  recipientId: string; senderName: string; conversationId: string; preview: string;
}) {
  createNotification({
    userId:  params.recipientId,
    type:    "new_message",
    title:   `Message from ${params.senderName}`,
    body:    params.preview.length > 80
      ? params.preview.slice(0, 80) + "…"
      : params.preview,
    linkUrl: `/messages?c=${params.conversationId}`,
  });
}