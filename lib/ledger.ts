import {
  BalanceBucket,
  Currency,
  Prisma,
  WalletOwnerType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

type LedgerEntryInput = {
  walletId: string;
  bucket: BalanceBucket;
  amountMinor: bigint;
  currency: Currency;
};

export class InsufficientFundsError extends Error {
  constructor() {
    super("Insufficient available balance");
    this.name = "InsufficientFundsError";
  }
}

async function getOrCreateWallet(
  tx: Prisma.TransactionClient,
  ownerType: WalletOwnerType,
  ownerId: string,
  currency: Currency,
) {
  return tx.wallet.upsert({
    where: { ownerType_ownerId_currency: { ownerType, ownerId, currency } },
    update: {},
    create: { ownerType, ownerId, currency },
  });
}

async function recordLedgerTransaction(
  tx: Prisma.TransactionClient,
  kind: string,
  reference: string,
  entries: LedgerEntryInput[],
) {
  const nonZeroEntries = entries.filter((entry) => entry.amountMinor !== BigInt(0));
  if (!nonZeroEntries.length) return;

  await tx.ledgerTransaction.create({
    data: {
      kind,
      reference,
      entries: {
        create: nonZeroEntries,
      },
    },
  });
}

export async function getBalances(ownerType: WalletOwnerType, ownerId: string) {
  return prisma.wallet.findMany({
    where: { ownerType, ownerId },
    orderBy: { currency: "asc" },
  });
}

export async function confirmPayment(paymentId: string, providerRef: string): Promise<{ alreadyProcessed: boolean }> {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
    const platformNetMinor = payment.platformFeeMinor - payment.processorFeeMinor;
    const claimed = await tx.payment.updateMany({
      where: { id: paymentId, status: "INITIATED" },
      data: { status: "CONFIRMED", providerRef, platformNetMinor },
    });
    if (!claimed.count) return { alreadyProcessed: true };

    const organiserWallet = await getOrCreateWallet(
      tx,
      WalletOwnerType.ORGANISER,
      payment.organiserOwnerId,
      payment.currency,
    );
    const platformWallet = await getOrCreateWallet(
      tx,
      WalletOwnerType.PLATFORM,
      "platform",
      payment.currency,
    );

    await tx.wallet.update({
      where: { id: organiserWallet.id },
      data: { pendingMinor: { increment: payment.organiserNetMinor } },
    });
    await tx.wallet.update({
      where: { id: platformWallet.id },
      data: { pendingMinor: { increment: platformNetMinor } },
    });
    await recordLedgerTransaction(tx, "PAYMENT_CONFIRMED", `payment:${payment.id}`, [
      {
        walletId: organiserWallet.id,
        bucket: BalanceBucket.PENDING,
        amountMinor: payment.organiserNetMinor,
        currency: payment.currency,
      },
      {
        walletId: platformWallet.id,
        bucket: BalanceBucket.PENDING,
        amountMinor: platformNetMinor,
        currency: payment.currency,
      },
    ]);
    await tx.order.update({ where: { id: payment.orderId }, data: { status: "paid" } });

    return { alreadyProcessed: false };
  });
}

async function releasePayment(
  paymentId: string,
  expectedRail: "DARAJA" | "USDC_ONCHAIN",
  reference: string,
) {
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
    if (payment.rail !== expectedRail) {
      throw new Error(`Payment ${paymentId} cannot be released through ${expectedRail}`);
    }
    const claimed = await tx.payment.updateMany({
      where: { id: paymentId, status: "CONFIRMED" },
      data: { status: "RELEASED" },
    });
    if (!claimed.count) return;

    const platformNetMinor = payment.platformNetMinor ||
      payment.platformFeeMinor - payment.processorFeeMinor;
    const organiserWallet = await getOrCreateWallet(
      tx,
      WalletOwnerType.ORGANISER,
      payment.organiserOwnerId,
      payment.currency,
    );
    const platformWallet = await getOrCreateWallet(
      tx,
      WalletOwnerType.PLATFORM,
      "platform",
      payment.currency,
    );

    await tx.wallet.update({
      where: { id: organiserWallet.id },
      data: {
        pendingMinor: { decrement: payment.organiserNetMinor },
        availableMinor: { increment: payment.organiserNetMinor },
      },
    });
    await tx.wallet.update({
      where: { id: platformWallet.id },
      data: {
        pendingMinor: { decrement: platformNetMinor },
        availableMinor: { increment: platformNetMinor },
      },
    });
    await recordLedgerTransaction(tx, "PAYMENT_RELEASED", reference, [
      {
        walletId: organiserWallet.id,
        bucket: BalanceBucket.PENDING,
        amountMinor: -payment.organiserNetMinor,
        currency: payment.currency,
      },
      {
        walletId: organiserWallet.id,
        bucket: BalanceBucket.AVAILABLE,
        amountMinor: payment.organiserNetMinor,
        currency: payment.currency,
      },
      {
        walletId: platformWallet.id,
        bucket: BalanceBucket.PENDING,
        amountMinor: -platformNetMinor,
        currency: payment.currency,
      },
      {
        walletId: platformWallet.id,
        bucket: BalanceBucket.AVAILABLE,
        amountMinor: platformNetMinor,
        currency: payment.currency,
      },
    ]);
  });
}

export async function releasePending(paymentId: string) {
  await releasePayment(paymentId, "DARAJA", `payment-release:${paymentId}`);
}

export async function settleOnchainRelease(paymentId: string, transactionHash: string) {
  await releasePayment(paymentId, "USDC_ONCHAIN", `payment-release:${paymentId}:${transactionHash}`);
}

export async function reservePayout({
  ownerType,
  ownerId,
  currency,
  amountMinor,
  destination,
  idempotencyKey,
}: {
  ownerType: WalletOwnerType;
  ownerId: string;
  currency: Currency;
  amountMinor: bigint;
  destination: string;
  idempotencyKey: string;
}) {
  const validateExisting = (payout: {
    wallet: { ownerType: WalletOwnerType; ownerId: string };
    currency: Currency;
    amountMinor: bigint;
    destination: string;
  }) => {
    if (
      payout.wallet.ownerType !== ownerType ||
      payout.wallet.ownerId !== ownerId ||
      payout.currency !== currency ||
      payout.amountMinor !== amountMinor ||
      payout.destination !== destination
    ) {
      throw new Error("Idempotency key was already used for a different payout");
    }
  };

  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.payout.findUnique({
        where: { idempotencyKey },
        include: { wallet: true },
      });
      if (existing) {
        validateExisting(existing);
        return existing;
      }

      const wallet = await getOrCreateWallet(tx, ownerType, ownerId, currency);
      const payout = await tx.payout.create({
        data: {
          walletId: wallet.id,
          currency,
          amountMinor,
          method: "MPESA",
          destination,
          idempotencyKey,
        },
        include: { wallet: true },
      });
      const debited = await tx.wallet.updateMany({
        where: { id: wallet.id, availableMinor: { gte: amountMinor } },
        data: { availableMinor: { decrement: amountMinor } },
      });
      if (!debited.count) throw new InsufficientFundsError();

      await recordLedgerTransaction(tx, "PAYOUT_RESERVED", `payout-reserve:${payout.id}`, [
        {
          walletId: wallet.id,
          bucket: BalanceBucket.AVAILABLE,
          amountMinor: -amountMinor,
          currency,
        },
      ]);
      return payout;
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      throw error;
    }
    const existing = await prisma.payout.findUnique({
      where: { idempotencyKey },
      include: { wallet: true },
    });
    if (!existing) throw error;
    validateExisting(existing);
    return existing;
  }
}

export async function beginPayoutProcessing(payoutId: string): Promise<boolean> {
  const updated = await prisma.payout.updateMany({
    where: { id: payoutId, status: "REQUESTED" },
    data: { status: "PROCESSING" },
  });
  return Boolean(updated.count);
}

export async function markPayoutProcessing(
  payoutId: string,
  providerRef: string | null,
  originatorConversationId: string,
  conversationId: string,
) {
  const updated = await prisma.payout.updateMany({
    where: { id: payoutId, status: "PROCESSING" },
    data: { providerRef, originatorConversationId, conversationId },
  });
  if (!updated.count) throw new Error(`Payout ${payoutId} is not processing`);
}

export async function markPayoutPaid(payoutId: string) {
  await prisma.payout.updateMany({
    where: { id: payoutId, status: "PROCESSING" },
    data: { status: "PAID" },
  });
}

export async function markPayoutFailed(payoutId: string, reason: string) {
  await prisma.$transaction(async (tx) => {
    const payout = await tx.payout.findUniqueOrThrow({ where: { id: payoutId } });
    const claimed = await tx.payout.updateMany({
      where: { id: payoutId, status: { in: ["REQUESTED", "PROCESSING"] } },
      data: { status: "FAILED", failureReason: reason },
    });
    if (!claimed.count) return;

    await tx.wallet.update({
      where: { id: payout.walletId },
      data: { availableMinor: { increment: payout.amountMinor } },
    });
    await recordLedgerTransaction(tx, "PAYOUT_FAILED", `payout-failure:${payout.id}`, [
      {
        walletId: payout.walletId,
        bucket: BalanceBucket.AVAILABLE,
        amountMinor: payout.amountMinor,
        currency: payout.currency,
      },
    ]);
  });
}
