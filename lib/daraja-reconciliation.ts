import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { PAYMENT_CONFIRMATION_TIMEOUT_MS } from "@/lib/paymentTiming";
import { verifyTransaction } from "@/lib/daraja";
import { creditWalletInTransaction } from "@/lib/wallet";
import { confirmPayment } from "@/lib/ledger";

async function failTicketOrder(tx: Prisma.TransactionClient, orderId: string) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: { eventId: true, items: { select: { quantity: true } } },
  });
  if (!order) return;

  const failed = await tx.order.updateMany({
    where: { id: orderId, status: "pending" },
    data: { status: "failed" },
  });
  if (failed.count) {
    const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
    if (quantity > 0) {
      await tx.event.update({
        where: { id: order.eventId },
        data: { attendees: { decrement: quantity } },
      });
    }
  }
}

export async function failPaymentRecord(paymentId: string, reason: string) {
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.paymentRecord.updateMany({
      where: { id: paymentId, status: "pending" },
      data: { status: "failed" },
    });
    if (!claimed.count) return;

    const payment = await tx.paymentRecord.findUniqueOrThrow({ where: { id: paymentId } });
    if (payment.orderId) await failTicketOrder(tx, payment.orderId);
    if (payment.slotApplicationId) {
      await tx.slotApplication.updateMany({
        where: { id: payment.slotApplicationId, status: "approved" },
        data: { status: "payment_failed" },
      });
    }
    if (payment.serviceBookingId) {
      await tx.serviceBooking.updateMany({
        where: { id: payment.serviceBookingId, status: "approved" },
        data: { status: "payment_failed" },
      });
    }
  });
  console.warn("Daraja verified payment failure", { paymentId, reason });
}

export async function failLedgerDarajaPayment(paymentId: string, orderId: string) {
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({
      where: { id: paymentId, status: "INITIATED" },
      data: { status: "FAILED" },
    });
    if (!claimed.count) return;
    await failTicketOrder(tx, orderId);
  });
}

async function finalizeVerifiedPaymentRecord(paymentId: string, checkoutRequestId: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.paymentRecord.findUniqueOrThrow({ where: { id: paymentId } });
    const claimed = await tx.paymentRecord.updateMany({
      where: { id: paymentId, status: "pending" },
      data: { status: "successful", providerRef: checkoutRequestId },
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
        grossAmount: payment.amount,
        description: `Ticket sales — ${order.event.title}`,
        paymentTxRef: payment.txRef,
      });
      return true;
    }

    if (payment.slotApplicationId) {
      const application = await tx.slotApplication.findUnique({
        where: { id: payment.slotApplicationId },
        include: { slot: { include: { event: { select: { title: true, createdById: true } } } } },
      });
      if (!application) throw new Error(`Paid application ${payment.slotApplicationId} was not found`);
      await tx.slotApplication.update({ where: { id: application.id }, data: { status: "confirmed" } });
      const confirmedCount = await tx.slotApplication.count({
        where: { slotId: application.slotId, status: "confirmed" },
      });
      if (confirmedCount >= application.slot.totalSlots) {
        await tx.vendingSlot.update({ where: { id: application.slotId }, data: { status: "closed" } });
      }
      await creditWalletInTransaction(tx, {
        ownerUserId: application.slot.event.createdById,
        grossAmount: payment.amount,
        description: `Vending slot — ${application.slot.title} @ ${application.slot.event.title}`,
        paymentTxRef: payment.txRef,
      });
      return true;
    }

    if (payment.serviceBookingId) {
      const booking = await tx.serviceBooking.findUnique({
        where: { id: payment.serviceBookingId },
        include: { listing: { select: { title: true, profile: { select: { userId: true } } } } },
      });
      if (!booking) throw new Error(`Paid booking ${payment.serviceBookingId} was not found`);
      await tx.serviceBooking.update({ where: { id: booking.id }, data: { status: "confirmed" } });
      await creditWalletInTransaction(tx, {
        ownerUserId: booking.listing.profile.userId,
        grossAmount: payment.amount,
        description: `Marketplace booking — ${booking.listing.title}`,
        paymentTxRef: payment.txRef,
      });
      return true;
    }

    throw new Error(`Payment record ${paymentId} has no supported linked purchase`);
  }, { maxWait: 10_000, timeout: 30_000 });
}

export async function reconcileStaleDarajaPayment(
  txRef: string,
  kind: "record" | "ledger",
): Promise<void> {
  const cutoff = new Date(Date.now() - PAYMENT_CONFIRMATION_TIMEOUT_MS);
  const now = new Date();

  if (kind === "record") {
    const payment = await prisma.paymentRecord.findUnique({
      where: { txRef },
      select: {
        id: true,
        status: true,
        amount: true,
        updatedAt: true,
        checkoutRequestId: true,
        merchantRequestId: true,
      },
    });
    if (
      !payment ||
      payment.status !== "pending" ||
      !payment.checkoutRequestId ||
      payment.updatedAt > cutoff
    ) return;

    const claimed = await prisma.paymentRecord.updateMany({
      where: {
        id: payment.id,
        status: "pending",
        checkoutRequestId: payment.checkoutRequestId,
        updatedAt: { lte: cutoff },
      },
      data: { updatedAt: now },
    });
    if (!claimed.count) return;

    const verified = await verifyTransaction(payment.checkoutRequestId);
    if (
      verified.CheckoutRequestID !== payment.checkoutRequestId ||
      (payment.merchantRequestId && verified.MerchantRequestID && verified.MerchantRequestID !== payment.merchantRequestId)
    ) {
      throw new Error("Daraja status response identifiers do not match the payment");
    }
    if (verified.ResultCode === undefined) return;
    if (verified.ResultCode === 0) {
      if (verified.MerchantRequestID !== payment.merchantRequestId) {
        throw new Error("Daraja status response is missing the matching MerchantRequestID");
      }
      await finalizeVerifiedPaymentRecord(payment.id, payment.checkoutRequestId);
      return;
    }
    await failPaymentRecord(payment.id, verified.ResultDesc);
    return;
  }

  const payment = await prisma.payment.findUnique({
    where: { id: txRef },
    select: {
      id: true,
      orderId: true,
      status: true,
      updatedAt: true,
      checkoutRequestId: true,
      merchantRequestId: true,
    },
  });
  if (
    !payment ||
    payment.status !== "INITIATED" ||
    !payment.checkoutRequestId ||
    payment.updatedAt > cutoff
  ) return;

  const claimed = await prisma.payment.updateMany({
    where: {
      id: payment.id,
      status: "INITIATED",
      checkoutRequestId: payment.checkoutRequestId,
      updatedAt: { lte: cutoff },
    },
    data: { updatedAt: now },
  });
  if (!claimed.count) return;

  const verified = await verifyTransaction(payment.checkoutRequestId);
  if (
    verified.CheckoutRequestID !== payment.checkoutRequestId ||
    (payment.merchantRequestId && verified.MerchantRequestID && verified.MerchantRequestID !== payment.merchantRequestId)
  ) {
    throw new Error("Daraja status response identifiers do not match the payment");
  }
  if (verified.ResultCode === undefined) return;
  if (verified.ResultCode === 0) {
    if (verified.MerchantRequestID !== payment.merchantRequestId) {
      throw new Error("Daraja status response is missing the matching MerchantRequestID");
    }
    await confirmPayment(payment.id, payment.checkoutRequestId);
    return;
  }
  await failLedgerDarajaPayment(payment.id, payment.orderId);
}
