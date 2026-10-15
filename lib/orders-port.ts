/**
 * Integration points with the existing Order/auth code.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { Currency } from "./money";
import { toMinor } from "./money";

export interface PayableOrder {
  id: string;
  eventId: string;
  buyerEmail: string;
  buyerPhone?: string;
  buyerName?: string;
  listingCurrency: Currency;
  faceMinor: bigint;
  organiserOwnerId: string;
  payoutCurrency: Currency;
  usdcPayoutAddress?: `0x${string}`;
  releaseAt: Date;
}

export interface PayoutProfile {
  ownerType: "ORGANISER" | "VENDOR";
  ownerId: string;
  kycVerified: boolean;
  mpesaPhone?: string;
}

export async function requireUserId(_req: Request): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function getPayableOrder(orderId: string, userId: string): Promise<PayableOrder> {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId,
      NOT: { status: { in: ["paid", "confirmed", "failed", "cancelled", "refunded"] } },
    },
    include: { event: true },
  });

  if (!order || !order.event) {
    throw new Error("Order not found or not payable");
  }

  const listingCurrency: Currency = order.event.listingCurrency ?? "KES";
  const payoutCurrency: Currency = order.event.payoutCurrency ?? "KES";
  const totalAmount = Number(order.totalAmount || 0);
  const faceMinor = toMinor(totalAmount.toFixed(2), listingCurrency);

  return {
    id: order.id,
    eventId: order.eventId,
    buyerEmail: order.email,
    buyerPhone: order.phone || undefined,
    buyerName: order.name || undefined,
    listingCurrency,
    faceMinor,
    organiserOwnerId: order.event.createdById,
    payoutCurrency,
    usdcPayoutAddress: (order.event.usdcPayoutAddress as `0x${string}` | undefined) ?? undefined,
    releaseAt: new Date(Date.now() + 1000 * 60 * 60 * 48),
  };
}

export async function onOrderPaid(orderId: string): Promise<void> {
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "paid" },
  });
}

export async function getPayoutProfile(userId: string): Promise<PayoutProfile> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { marketProfile: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const ownerType = user.marketProfile ? "VENDOR" : "ORGANISER";
  return {
    ownerType,
    ownerId: user.id,
    kycVerified: Boolean(user.marketProfile?.isVerified ?? false),
    mpesaPhone: user.marketProfile?.phone ?? undefined,
  };
}
