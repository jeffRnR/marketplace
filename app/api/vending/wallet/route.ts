// app/api/vending/wallet/route.ts
// GET — returns the authenticated user's wallet balance + transaction history

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where:  { email: session.user.email },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const wallet = await prisma.vendorWallet.findUnique({
      where:   { userId: user.id },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take:    100,
        },
        withdrawalRequests: {
          orderBy: { createdAt: "desc" },
          take:    20,
          select: {
            id:          true,
            amount:      true,
            method:      true,
            status:      true,
            failureNote: true,
            createdAt:   true,
            updatedAt:   true,
            // Never return encryptedPayoutDetails
          },
        },
      },
    });

    if (!wallet) {
      // Wallet hasn't been created yet — return zeros
      return NextResponse.json({
        balance:            0,
        totalEarned:        0,
        totalWithdrawn:     0,
        transactions:       [],
        withdrawalRequests: [],
      });
    }

    return NextResponse.json({
      balance:            wallet.balance,
      totalEarned:        wallet.totalEarned,
      totalWithdrawn:     wallet.totalWithdrawn,
      transactions:       wallet.transactions,
      withdrawalRequests: wallet.withdrawalRequests,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}