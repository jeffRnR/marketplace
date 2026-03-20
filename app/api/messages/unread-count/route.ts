// app/api/messages/unread-count/route.ts
// GET — returns total unread message count for the current user
// Used by NotificationBar to show badge

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ count: 0 });

  const user = await prisma.user.findUnique({
    where:  { email: session.user.email },
    select: { id: true, marketProfile: { select: { id: true } } },
  });
  if (!user) return NextResponse.json({ count: 0 });

  // Conversations where I'm the buyer — count unread from vendor
  const buyerUnread = await prisma.message.count({
    where: {
      conversation: { buyerId: user.id },
      senderId:     { not: user.id },
      readAt:       null,
    },
  });

  // Conversations where I'm the vendor — count unread from buyer
  let vendorUnread = 0;
  if (user.marketProfile) {
    vendorUnread = await prisma.message.count({
      where: {
        conversation: { vendorProfileId: user.marketProfile.id },
        senderId:     { not: user.id },
        readAt:       null,
      },
    });
  }

  return NextResponse.json({ count: buyerUnread + vendorUnread });
}