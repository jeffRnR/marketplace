// app/api/messages/[conversationId]/read/route.ts
// PATCH — mark all unread messages in a conversation as read

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PATCH(_req: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where:  { email: session.user.email },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.message.updateMany({
    where: {
      conversationId,
      senderId:       { not: user.id },
      readAt:         null,
    },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ success: true });
}