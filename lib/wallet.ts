// lib/wallet.ts
// Atomic wallet operations — all mutations use prisma.$transaction()
// so no partial state is ever written to the DB.
//
// Fee model:
//   platformFee = amount * PLATFORM_FEE_RATE  (5%)
//   ownerCredit = amount - platformFee         (95%)

import prisma from "@/lib/prisma";

export const PLATFORM_FEE_RATE = 0.05; // 5%

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreditResult {
  walletId:      string;
  credited:      number;
  platformFee:   number;
  balanceAfter:  number;
}

// ─── Ensure wallet exists ─────────────────────────────────────────────────────
// Creates a wallet for the user if one doesn't exist yet (lazy creation).

export async function ensureWallet(userId: string): Promise<string> {
  const existing = await prisma.vendorWallet.findUnique({
    where:  { userId },
    select: { id: true },
  });
  if (existing) return existing.id;

  const wallet = await prisma.vendorWallet.create({
    data:   { userId },
    select: { id: true },
  });
  return wallet.id;
}

// ─── Credit wallet after successful payment ───────────────────────────────────
// Splits the incoming amount into platform fee (5%) and owner credit (95%).
// Writes two WalletTransaction rows and updates VendorWallet.balance atomically.

export async function creditWallet({
  ownerUserId,
  grossAmount,
  description,
  paymentTxRef,
}: {
  ownerUserId:  string;
  grossAmount:  number;
  description:  string;
  paymentTxRef: string;
}): Promise<CreditResult> {
  const walletId   = await ensureWallet(ownerUserId);
  const platformFee = Math.round(grossAmount * PLATFORM_FEE_RATE * 100) / 100;
  const ownerCredit = Math.round((grossAmount - platformFee) * 100) / 100;

  const result = await prisma.$transaction(async (tx) => {
    // Lock the wallet row for update
    const wallet = await tx.vendorWallet.findUniqueOrThrow({
      where: { id: walletId },
    });

    const newBalance = Math.round((wallet.balance + ownerCredit) * 100) / 100;
    const newEarned  = Math.round((wallet.totalEarned + grossAmount) * 100) / 100;

    // Update wallet totals
    await tx.vendorWallet.update({
      where: { id: walletId },
      data:  { balance: newBalance, totalEarned: newEarned },
    });

    // Record platform fee (informational — platform's cut)
    await tx.walletTransaction.create({
      data: {
        walletId,
        type:         "platform_fee",
        amount:       -platformFee,
        description:  `Platform fee (5%) — ${description}`,
        balanceAfter: wallet.balance,   // balance before the credit
        paymentTxRef,
      },
    });

    // Record owner credit
    await tx.walletTransaction.create({
      data: {
        walletId,
        type:         "credit",
        amount:       ownerCredit,
        description,
        balanceAfter: newBalance,
        paymentTxRef,
      },
    });

    return { walletId, credited: ownerCredit, platformFee, balanceAfter: newBalance };
  });

  return result;
}

// ─── Debit wallet for withdrawal ──────────────────────────────────────────────
// Validates sufficient balance, then debits atomically.
// Returns the updated balance.

export async function debitWalletForWithdrawal({
  walletId,
  amount,
  description,
}: {
  walletId:    string;
  amount:      number;
  description: string;
}): Promise<{ balanceAfter: number }> {
  const result = await prisma.$transaction(async (tx) => {
    const wallet = await tx.vendorWallet.findUniqueOrThrow({
      where: { id: walletId },
    });

    if (wallet.balance < amount) {
      throw new Error(
        `Insufficient balance. Available: KES ${wallet.balance.toLocaleString()}, requested: KES ${amount.toLocaleString()}`
      );
    }

    const newBalance   = Math.round((wallet.balance - amount) * 100) / 100;
    const newWithdrawn = Math.round((wallet.totalWithdrawn + amount) * 100) / 100;

    await tx.vendorWallet.update({
      where: { id: walletId },
      data:  { balance: newBalance, totalWithdrawn: newWithdrawn },
    });

    await tx.walletTransaction.create({
      data: {
        walletId,
        type:         "withdrawal",
        amount:       -amount,
        description,
        balanceAfter: newBalance,
      },
    });

    return { balanceAfter: newBalance };
  });

  return result;
}