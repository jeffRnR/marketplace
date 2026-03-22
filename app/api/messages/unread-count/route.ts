// app/api/messages/unread-count/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ unreadCount: 0 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) return NextResponse.json({ unreadCount: 0 });

    // Count unread messages across all conversations the user participates in —
    // either as a buyer (buyerId) or as a vendor (via MarketProfile.userId).
    const unreadCount = await prisma.message.count({
      where: {
        senderId: { not: user.id },
        readAt:   null,
        conversation: {
          OR: [
            { buyerId: user.id },
            { vendorProfile: { userId: user.id } },
          ],
        },
      },
    });

    return NextResponse.json({ unreadCount });
  } catch (err) {
    console.error("[unread-count]", err);
    return NextResponse.json({ unreadCount: 0 });
  }
}