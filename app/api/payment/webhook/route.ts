import prisma from "@/lib/prisma";
import { verifyTransaction } from "@/lib/daraja";
import { creditWalletInTransaction } from "@/lib/wallet";
import { confirmPayment } from "@/lib/ledger";
import { failLedgerDarajaPayment, failPaymentRecord } from "@/lib/daraja-reconciliation";
import { normalizeMpesaPhone } from "@/lib/mpesaPhone";
import { sendTicketEmailForOrder } from "@/lib/ticket-email-delivery";
import {
  sendVendingConfirmationEmail,
  sendBookingEmail,
  sendSMS,
} from "@/lib/notifications";
import {
  notifyTicketOrder,
  notifyVendingConfirmed,
  notifyBookingConfirmed,
} from "@/lib/createNotification";

type CallbackItem = { Name?: string; Value?: string | number };
type DarajaCallback = {
  Body?: {
    stkCallback?: {
      MerchantRequestID?: string;
      CheckoutRequestID?: string;
      ResultCode?: number | string;
      ResultDesc?: string;
      CallbackMetadata?: { Item?: CallbackItem[] };
    };
  };
};

function getMetadata(items: CallbackItem[] | undefined) {
  return new Map((items ?? []).map((item) => [item.Name ?? "", item.Value]));
}

export async function POST(req: Request) {
  let payload: DarajaCallback;
  try {
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > 32_768) return Response.json({ error: "Callback too large" }, { status: 413 });
    const raw = await req.text();
    if (raw.length > 32_768) return Response.json({ error: "Callback too large" }, { status: 413 });
    payload = JSON.parse(raw) as DarajaCallback;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const callback = payload.Body?.stkCallback;
  const checkoutRequestId = callback?.CheckoutRequestID;
  const merchantRequestId = callback?.MerchantRequestID;
  if (
    !callback ||
    typeof checkoutRequestId !== "string" ||
    !checkoutRequestId ||
    checkoutRequestId.length > 200 ||
    typeof merchantRequestId !== "string" ||
    !merchantRequestId ||
    merchantRequestId.length > 200
  ) {
    return Response.json({ error: "Missing Daraja callback identifiers" }, { status: 400 });
  }

  const ledgerPayment = await prisma.payment.findUnique({ where: { checkoutRequestId } });
  const payment = ledgerPayment
    ? null
    : await prisma.paymentRecord.findUnique({ where: { checkoutRequestId } });
  if (!payment && !ledgerPayment) {
    console.warn("Daraja callback does not match a payment record", { checkoutRequestId });
    return Response.json({ error: "Payment not yet correlated" }, { status: 503 });
  }
  if (ledgerPayment) {
    if (ledgerPayment.merchantRequestId !== merchantRequestId) {
      console.error("Daraja merchant request ID mismatch", { paymentId: ledgerPayment.id });
      return Response.json({ error: "Callback identifier mismatch" }, { status: 400 });
    }
    if (ledgerPayment.status !== "INITIATED") return Response.json({ received: true, duplicate: true });
    const metadata = getMetadata(callback.CallbackMetadata?.Item);
    const callbackAmount = metadata.get("Amount");
    const amount = typeof callbackAmount === "number" ? callbackAmount : Number(callbackAmount);
    const callbackPhone = metadata.get("PhoneNumber");
    if (callbackPhone !== undefined) {
      const order = await prisma.order.findUnique({
        where: { id: ledgerPayment.orderId },
        select: { phone: true },
      });
      if (normalizeMpesaPhone(String(callbackPhone)) !== normalizeMpesaPhone(order?.phone ?? "")) {
        console.error("Daraja callback phone does not match payment", { paymentId: ledgerPayment.id });
        return Response.json({ error: "Callback phone does not match payment" }, { status: 400 });
      }
    }
    const expectedAmount = Number(ledgerPayment.grossMinor / BigInt(100));
    if (Number.isFinite(amount) && amount !== expectedAmount) {
      console.error("Daraja callback amount mismatch", { paymentId: ledgerPayment.id, expected: expectedAmount, received: amount });
      return Response.json({ error: "Callback amount mismatch" }, { status: 400 });
    }
    let verified;
    try {
      verified = await verifyTransaction(checkoutRequestId);
    } catch (error) {
      console.error("Daraja STK status query failed", { paymentId: ledgerPayment.id, error });
      return Response.json({ error: "Daraja status verification failed" }, { status: 503 });
    }
    if (verified.CheckoutRequestID !== checkoutRequestId || (
      verified.MerchantRequestID && verified.MerchantRequestID !== merchantRequestId
    )) {
      return Response.json({ error: "Daraja status response mismatch" }, { status: 503 });
    }
    if (verified.ResultCode === undefined) {
      return Response.json({ error: "Daraja has not returned a terminal payment result" }, { status: 503 });
    }
    if (verified.ResultCode !== 0) {
      await failLedgerDarajaPayment(ledgerPayment.id, ledgerPayment.orderId);
      return Response.json({ received: true, status: "failed" });
    }
    if (!Number.isFinite(amount) || amount !== expectedAmount) {
      return Response.json({ error: "Verified payment amount is unavailable or mismatched" }, { status: 400 });
    }
    const receipt = metadata.get("MpesaReceiptNumber");
    await confirmPayment(ledgerPayment.id, typeof receipt === "string" ? receipt : checkoutRequestId);
    return Response.json({ received: true, status: "successful" });
  }
  if (!payment) return Response.json({ error: "Payment not found" }, { status: 503 });
  if (payment.merchantRequestId !== merchantRequestId) {
    console.error("Daraja merchant request ID mismatch", { txRef: payment.txRef });
    return Response.json({ error: "Callback identifier mismatch" }, { status: 400 });
  }
  if (payment.status !== "pending") return Response.json({ received: true, duplicate: true });

  const metadata = getMetadata(callback.CallbackMetadata?.Item);
  const callbackAmount = metadata.get("Amount");
  const amount = typeof callbackAmount === "number" ? callbackAmount : Number(callbackAmount);
  const callbackPhone = metadata.get("PhoneNumber");
  if (
    callbackPhone !== undefined &&
    normalizeMpesaPhone(String(callbackPhone)) !== normalizeMpesaPhone(payment.phone)
  ) {
    console.error("Daraja callback phone does not match payment", { txRef: payment.txRef });
    return Response.json({ error: "Callback phone does not match payment" }, { status: 400 });
  }
  if (Number.isFinite(amount) && amount !== payment.amount) {
    console.error("Daraja callback amount mismatch", { txRef: payment.txRef, expected: payment.amount, received: amount });
    return Response.json({ error: "Callback amount mismatch" }, { status: 400 });
  }

  let verified;
  try {
    verified = await verifyTransaction(checkoutRequestId);
  } catch (error) {
    console.error("Daraja STK status query failed", { txRef: payment.txRef, error });
    return Response.json({ error: "Daraja status verification failed" }, { status: 503 });
  }

  if (verified.CheckoutRequestID !== checkoutRequestId || (
    verified.MerchantRequestID && verified.MerchantRequestID !== merchantRequestId
  )) {
    console.error("Daraja status response ID mismatch", { txRef: payment.txRef });
    return Response.json({ error: "Daraja status response mismatch" }, { status: 503 });
  }

  if (verified.ResultCode === undefined) {
    return Response.json({ error: "Daraja has not returned a terminal payment result" }, { status: 503 });
  }
  if (verified.ResultCode !== 0) {
    await failPaymentRecord(payment.id, callback.ResultDesc ?? verified.ResultDesc);
    return Response.json({ received: true, status: "failed" });
  }

  if (!Number.isFinite(amount) || amount !== payment.amount) {
    console.error("Daraja success callback did not contain the expected amount", { txRef: payment.txRef });
    return Response.json({ error: "Verified payment amount is unavailable or mismatched" }, { status: 400 });
  }

  const receipt = metadata.get("MpesaReceiptNumber");
  const finalized = await finalizePayment(
    payment.id,
    payment.txRef,
    typeof receipt === "string" ? receipt : checkoutRequestId,
    payment.amount,
  );
  if (!finalized) return Response.json({ received: true, duplicate: true });

  await sendConfirmation(payment, finalized, req);
  return Response.json({ received: true, status: "successful" });
}

type FinalizedPayment =
  | { kind: "ticket"; order: Awaited<ReturnType<typeof getTicketOrder>> }
  | { kind: "vending"; application: Awaited<ReturnType<typeof getVendingApplication>> }
  | { kind: "booking"; booking: Awaited<ReturnType<typeof getBooking>> }
  | null;

async function finalizePayment(paymentId: string, txRef: string, providerRef: string, amount: number): Promise<FinalizedPayment | false> {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.paymentRecord.findUniqueOrThrow({ where: { id: paymentId } });
    const claimed = await tx.paymentRecord.updateMany({
      where: { id: paymentId, status: "pending" },
      data: { status: "successful", providerRef },
    });
    if (!claimed.count) return false;

    if (payment.orderId) {
      const order = await tx.order.findUnique({
        where: { id: payment.orderId },
        include: { event: { select: { title: true, createdById: true } } },
      });
      if (!order) throw new Error(`Paid order ${payment.orderId} was not found`);
      await tx.order.update({ where: { id: order.id }, data: { status: "confirmed" } });
      await creditWalletInTransaction(tx, {
        ownerUserId: order.event.createdById,
        grossAmount: amount,
        description: `Ticket sales — ${order.event.title}`,
        paymentTxRef: txRef,
      });
      return { kind: "ticket", order: await getTicketOrder(order.id) };
    }

    if (payment.slotApplicationId) {
      const application = await tx.slotApplication.findUnique({
        where: { id: payment.slotApplicationId },
        include: { slot: { include: { event: { select: { title: true, date: true, location: true, createdById: true } } } } },
      });
      if (!application) throw new Error(`Paid application ${payment.slotApplicationId} was not found`);
      await tx.slotApplication.update({ where: { id: application.id }, data: { status: "confirmed" } });
      const confirmedCount = await tx.slotApplication.count({ where: { slotId: application.slotId, status: "confirmed" } });
      if (confirmedCount >= application.slot.totalSlots) {
        await tx.vendingSlot.update({ where: { id: application.slotId }, data: { status: "closed" } });
      }
      await creditWalletInTransaction(tx, {
        ownerUserId: application.slot.event.createdById,
        grossAmount: amount,
        description: `Vending slot — ${application.slot.title} @ ${application.slot.event.title}`,
        paymentTxRef: txRef,
      });
      return { kind: "vending", application: await getVendingApplication(application.id) };
    }

    if (payment.serviceBookingId) {
      const booking = await tx.serviceBooking.findUnique({
        where: { id: payment.serviceBookingId },
        include: {
          listing: { select: { title: true, profile: { select: { userId: true, businessName: true } } } },
          conversation: { select: { buyer: { select: { name: true, email: true } } } },
        },
      });
      if (!booking) throw new Error(`Paid booking ${payment.serviceBookingId} was not found`);
      await tx.serviceBooking.update({ where: { id: booking.id }, data: { status: "confirmed" } });
      await creditWalletInTransaction(tx, {
        ownerUserId: booking.listing.profile.userId,
        grossAmount: amount,
        description: `Marketplace booking — ${booking.listing.title}`,
        paymentTxRef: txRef,
      });
      return { kind: "booking", booking: await getBooking(booking.id) };
    }

    throw new Error(`Payment record ${paymentId} has no supported linked purchase`);
  }, { maxWait: 10_000, timeout: 30_000 });
}

async function getTicketOrder(orderId: string) {
  return prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      items: true,
      event: { select: { title: true, date: true, location: true, createdById: true } },
    },
  });
}

async function getVendingApplication(applicationId: string) {
  return prisma.slotApplication.findUniqueOrThrow({
    where: { id: applicationId },
    include: { slot: { include: { event: { select: { title: true, date: true, location: true, createdById: true } } } } },
  });
}

async function getBooking(bookingId: string) {
  return prisma.serviceBooking.findUniqueOrThrow({
    where: { id: bookingId },
    include: {
      listing: { select: { title: true, profile: { select: { userId: true, businessName: true } } } },
      conversation: { select: { buyerId: true, buyer: { select: { name: true, email: true } } } },
    },
  });
}

async function sendConfirmation(payment: NonNullable<Awaited<ReturnType<typeof prisma.paymentRecord.findUnique>>>, finalized: Exclude<FinalizedPayment, false | null>, req: Request) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? new URL(req.url).origin;
  if (finalized.kind === "ticket") {
    const { order } = finalized;
    const eventDate = new Date(order.event.date).toLocaleDateString("en-KE", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    await sendTicketEmailForOrder(order.id, baseUrl);
    void sendSMS(order.phone, `Hi ${order.name}! Tickets for ${order.event.title} (${eventDate}) confirmed. KES ${order.totalAmount.toLocaleString()} paid. View: ${baseUrl}/ticket/${order.items[0]?.ticketCode}`);
    notifyTicketOrder({
      ownerId: order.event.createdById,
      buyerName: order.name,
      eventTitle: order.event.title,
      quantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
      ticketType: order.items[0]?.ticketType ?? "Ticket",
      isRsvp: false,
    });
    return;
  }
  if (finalized.kind === "vending") {
    const { application } = finalized;
    const eventDate = new Date(application.slot.event.date).toLocaleDateString("en-KE", { month: "long", day: "numeric", year: "numeric" });
    await sendVendingConfirmationEmail({
      to: application.contactEmail,
      name: application.contactName,
      eventTitle: application.slot.event.title,
      eventDate,
      eventLocation: application.slot.event.location,
      slotTitle: application.slot.title,
      amount: payment.amount,
      applicationId: application.id,
      baseUrl,
    });
    void sendSMS(application.contactPhone, `Hi ${application.contactName}! Vending slot (${application.slot.title}) at ${application.slot.event.title} on ${eventDate} confirmed. KES ${payment.amount.toLocaleString()} paid. Ref: ${application.id.slice(0, 8).toUpperCase()}`);
    notifyVendingConfirmed({
      ownerId: application.slot.event.createdById,
      businessName: application.businessName,
      slotTitle: application.slot.title,
      eventTitle: application.slot.event.title,
      amount: payment.amount,
    });
    return;
  }

  const { booking } = finalized;
  await sendBookingEmail({
    to: booking.conversation.buyer.email,
    subject: `Booking confirmed — ${booking.listing.title}`,
    name: booking.conversation.buyer.name ?? "there",
    body: `Your booking for "${booking.listing.title}" has been confirmed after M-Pesa payment.`,
    ctaUrl: `${baseUrl}/messages`,
    ctaLabel: "View booking",
  });
  notifyBookingConfirmed({
    buyerUserId: booking.conversation.buyerId,
    listingTitle: booking.listing.title,
    vendorName: booking.listing.profile.businessName,
  });
}
