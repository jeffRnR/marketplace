// app/api/messages/[conversationId]/route.ts
// GET  — fetch all messages in a conversation (marks them as read)
// POST — send a new message

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { broadcastMessage } from "@/app/api/messages/route";
import { notifyNewMessage } from "@/lib/createNotification";

async function getUser(email: string) {
  return prisma.user.findUnique({
    where:  { email },
    select: { id: true, name: true, marketProfile: { select: { id: true } } },
  });
}

async function assertParticipant(conversationId: string, userId: string, marketProfileId: string | null | undefined) {
  const conv = await prisma.conversation.findUnique({
    where:  { id: conversationId },
    select: { buyerId: true, vendorProfileId: true, vendorProfile: { select: { userId: true } } },
  });
  if (!conv) return null;
  const isVendor = conv.vendorProfile.userId === userId;
  const isBuyer  = conv.buyerId === userId;
  if (!isVendor && !isBuyer) return null;
  return { conv, isVendor, isBuyer };
}

export async function GET(req: Request, { params }: { params: { conversationId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getUser(session.user.email);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const check = await assertParticipant(params.conversationId, user.id, user.marketProfile?.id);
  if (!check) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Mark all messages NOT sent by me as read
  await prisma.message.updateMany({
    where: {
      conversationId: params.conversationId,
      senderId:       { not: user.id },
      readAt:         null,
    },
    data: { readAt: new Date() },
  });

  const [messages, conversation] = await Promise.all([
    prisma.message.findMany({
      where:   { conversationId: params.conversationId },
      include: { sender: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.conversation.findUnique({
      where:   { id: params.conversationId },
      include: {
        buyer:         { select: { id: true, name: true, email: true } },
        vendorProfile: { select: { id: true, businessName: true, logoImage: true, userId: true } },
        listing:       { select: { id: true, title: true, price: true, priceType: true, currency: true, images: true } },
        bookings: {
          orderBy: { createdAt: "desc" },
          include: { listing: { select: { title: true } } },
        },
      },
    }),
  ]);

  return NextResponse.json({ messages, conversation });
}

export async function POST(req: Request, { params }: { params: { conversationId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getUser(session.user.email);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const check = await assertParticipant(params.conversationId, user.id, user.marketProfile?.id);
  if (!check) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (!body.content?.trim()) return NextResponse.json({ error: "content required" }, { status: 400 });

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId: params.conversationId,
        senderId:       user.id,
        content:        body.content.trim(),
      },
    }),
    prisma.conversation.update({
      where: { id: params.conversationId },
      data:  { lastMessageAt: new Date() },
    }),
  ]);

  broadcastMessage(params.conversationId, {
    id:             message.id,
    conversationId: message.conversationId,
    senderId:       message.senderId,
    senderName:     user.name ?? session.user.email,
    content:        message.content,
    createdAt:      message.createdAt,
    readAt:         null,
  });

  // Notify the other participant
  const conv = await prisma.conversation.findUnique({
    where:  { id: params.conversationId },
    select: { buyerId: true, vendorProfile: { select: { userId: true } } },
  });
  if (conv) {
    const recipientId = check.isVendor ? conv.buyerId : conv.vendorProfile.userId;
    notifyNewMessage({
      recipientId,
      senderName:     user.name ?? session.user.email ?? "Someone",
      conversationId: params.conversationId,
      preview:        body.content.trim(),
    });
  }

  return NextResponse.json({ message }, { status: 201 });
}