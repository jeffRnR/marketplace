// app/api/vending/withdraw/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { assertB2CConfigured, createTransfer } from "@/lib/daraja";

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
    const { amount, phone, idempotencyKey } = body;
    const requestKey = typeof idempotencyKey === "string"
      ? idempotencyKey.trim()
      : req.headers.get("idempotency-key")?.trim();

    if (!amount || !phone?.trim() || !requestKey || requestKey.length > 128) {
      return NextResponse.json({ error: "amount, phone, and idempotencyKey are required" }, { status: 400 });
    }

    const numAmount = Number(amount);
    if (!Number.isSafeInteger(numAmount) || numAmount < MIN_WITHDRAWAL) {
      return NextResponse.json(
        { error: `Amount must be a whole-KES value of at least KES ${MIN_WITHDRAWAL.toLocaleString()}` },
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

    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet not found" },
        { status: 400 }
      );
    }

    const scopedIdempotencyKey = `${user.id}:${requestKey}`;
    const previous = await prisma.withdrawalRequest.findUnique({ where: { idempotencyKey: scopedIdempotencyKey } });
    if (previous) {
      if (previous.walletId !== wallet.id || previous.amount !== numAmount) {
        return NextResponse.json({ error: "Idempotency key was already used for a different payout" }, { status: 409 });
      }
      return NextResponse.json({
        success: true,
        withdrawalId: previous.id,
        amount: previous.amount,
        method: "mpesa",
        status: previous.status,
      });
    }

    assertB2CConfigured();
    const encryptedPayoutDetails = encrypt({ phone: normalizedPhone, method: "mpesa" });
    const reservation = await prisma.$transaction(async (tx) => {
      const existing = await tx.withdrawalRequest.findUnique({ where: { idempotencyKey: scopedIdempotencyKey } });
      if (existing) {
        if (existing.walletId !== wallet.id || existing.amount !== numAmount) {
          throw new Error("Idempotency key was already used for a different payout");
        }
        return { withdrawal: existing, created: false };
      }

      const currentWallet = await tx.vendorWallet.findUniqueOrThrow({ where: { id: wallet.id } });
      if (currentWallet.balance < numAmount) throw new Error("Insufficient available balance");
      const balanceAfter = Math.round((currentWallet.balance - numAmount) * 100) / 100;
      const request = await tx.withdrawalRequest.create({
        data: {
          walletId: wallet.id,
          amount: numAmount,
          method: "mpesa",
          encryptedPayoutDetails,
          status: "processing",
          idempotencyKey: scopedIdempotencyKey,
          providerRef: "pending",
        },
      });
      await tx.vendorWallet.update({
        where: { id: wallet.id },
        data: {
          balance: balanceAfter,
          totalWithdrawn: { increment: numAmount },
        },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "withdrawal",
          amount: -numAmount,
          description: `Withdrawal to M-Pesa ending ${normalizedPhone.slice(-4)}`,
          balanceAfter,
        },
      });
      return { withdrawal: request, created: true };
    });

    const { withdrawal } = reservation;
    if (!reservation.created) {
      return NextResponse.json({
        success: true,
        withdrawalId: withdrawal.id,
        amount: withdrawal.amount,
        method: "mpesa",
        status: withdrawal.status,
      });
    }

    try {
      const transfer = await createTransfer({
        reference: withdrawal.id,
        amountMinor: BigInt(numAmount) * BigInt(100),
        phone: normalizedPhone,
        narration: "Vendor earnings withdrawal",
      });
      await prisma.withdrawalRequest.update({
        where: { id: withdrawal.id },
        data: {
          providerRef: transfer.providerRef,
          originatorConversationId: transfer.originatorConversationId,
          conversationId: transfer.conversationId,
        },
      });
    } catch (error) {
      console.error("Daraja B2C outcome is unknown; withdrawal remains reserved for reconciliation", { withdrawalId: withdrawal.id, error });
      return NextResponse.json({
        withdrawalId: withdrawal.id,
        status: "processing",
        message: "Payout is awaiting Daraja reconciliation",
      }, { status: 202 });
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
    const status = err.message === "Insufficient available balance" ? 422 : err.message.startsWith("Idempotency key") ? 409 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}