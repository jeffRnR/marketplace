// app/api/vending/withdraw/route.ts
// POST — owner requests a withdrawal to their M-Pesa number.
//
// IntaSend B2C payout flow:
//   1. Validate amount and balance
//   2. Encrypt payout details at rest
//   3. Debit wallet atomically
//   4. Create WithdrawalRequest (status: "pending")
//   5. Call IntaSend B2C initiate + approve (requires_approval: "NO")
//   6. On success → status: "processing"
//   7. On failure → refund wallet + status: "failed"
//
// NOTE: IntaSend settles M-Pesa B2C payouts typically within minutes.
// Bank transfers are not supported in the current IntaSend B2C flow —
// M-Pesa is the primary payout method for Kenya.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { debitWalletForWithdrawal } from "@/lib/wallet";
import { initiateB2CPayout } from "@/lib/intasend";

const MIN_WITHDRAWAL = 100; // KES

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where:  { email: session.user.email },
      select: { id: true, name: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const { amount, phone } = body;
    // Simplified to M-Pesa only for Kenya focus
    // phone: "+254712345678" or "254712345678"

    if (!amount || !phone?.trim()) {
      return NextResponse.json({ error: "amount and phone are required" }, { status: 400 });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < MIN_WITHDRAWAL) {
      return NextResponse.json(
        { error: `Minimum withdrawal is KES ${MIN_WITHDRAWAL.toLocaleString()}` },
        { status: 400 }
      );
    }

    // Validate phone format
    const normalizedPhone = phone.trim().replace(/^\+/, "").replace(/\s/g, "");
    if (!/^254\d{9}$/.test(normalizedPhone)) {
      return NextResponse.json(
        { error: "Phone must be a valid Kenyan number starting with 254 (e.g. 254712345678)" },
        { status: 400 }
      );
    }

    const wallet = await prisma.vendorWallet.findUnique({
      where:  { userId: user.id },
      select: { id: true, balance: true },
    });

    if (!wallet || wallet.balance < numAmount) {
      return NextResponse.json(
        { error: `Insufficient balance. Available: KES ${(wallet?.balance ?? 0).toLocaleString()}` },
        { status: 400 }
      );
    }

    // Encrypt payout details before storing
    const encryptedPayoutDetails = encrypt({ phone: normalizedPhone, method: "mpesa" });

    const withdrawal = await prisma.withdrawalRequest.create({
      data: {
        walletId:              wallet.id,
        amount:                numAmount,
        method:                "mpesa",
        encryptedPayoutDetails,
        status:                "pending",
      },
    });

    // Debit wallet atomically
    await debitWalletForWithdrawal({
      walletId:    wallet.id,
      amount:      numAmount,
      description: `Withdrawal to M-Pesa ${normalizedPhone.slice(-4).padStart(normalizedPhone.length, "*")}`,
    });

    // Mark as processing
    await prisma.withdrawalRequest.update({
      where: { id: withdrawal.id },
      data:  { status: "processing" },
    });

    // Initiate IntaSend B2C payout
    const payoutResult = await initiateB2CPayout({
      phone:     normalizedPhone,
      amount:    numAmount,
      name:      user.name ?? "Vendor",
      narrative: "Platform earnings withdrawal",
    });

    if (!payoutResult.success) {
      // Refund wallet and mark as failed
      await prisma.$transaction([
        prisma.vendorWallet.update({
          where: { id: wallet.id },
          data:  { balance: { increment: numAmount }, totalWithdrawn: { decrement: numAmount } },
        }),
        prisma.walletTransaction.create({
          data: {
            walletId:     wallet.id,
            type:         "refund",
            amount:       numAmount,
            description:  "Withdrawal refund — payout failed",
            balanceAfter: wallet.balance,
          },
        }),
        prisma.withdrawalRequest.update({
          where: { id: withdrawal.id },
          data: {
            status:      "failed",
            failureNote: payoutResult.message,
          },
        }),
      ]);

      return NextResponse.json(
        { error: `Payout failed: ${payoutResult.message}. Your balance has been restored.` },
        { status: 502 }
      );
    }

    // Store tracking ID if returned
    if (payoutResult.trackingId) {
      await prisma.withdrawalRequest.update({
        where: { id: withdrawal.id },
        data:  { flwTransferRef: String(payoutResult.trackingId) },
      });
    }

    return NextResponse.json({
      success:      true,
      withdrawalId: withdrawal.id,
      amount:       numAmount,
      method:       "mpesa",
      status:       "processing",
      message:      `KES ${numAmount.toLocaleString()} is being sent to your M-Pesa.`,
    });

  } catch (err: any) {
    console.error("POST /api/vending/withdraw:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}