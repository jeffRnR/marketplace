// app/api/messages/route.ts
// GET  — list all conversations for the current user (as buyer or vendor)
// POST — start or retrieve an existing conversation

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

async function getUser(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, marketProfile: { select: { id: true } } },
  });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getUser(session.user.email);
  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  const [buyerConvs, vendorConvs] = await Promise.all([
    // Conversations where I'm the buyer
    prisma.conversation.findMany({
      where: { buyerId: user.id },
      include: {
        vendorProfile: {
          select: {
            id: true,
            businessName: true,
            logoImage: true,
            userId: true,
          },
        },
        listing: { select: { id: true, title: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            content: true,
            createdAt: true,
            senderId: true,
            readAt: true,
          },
        },
      },
      orderBy: { lastMessageAt: "desc" },
    }),
    // Conversations where I'm the vendor
    user.marketProfile
      ? prisma.conversation.findMany({
          where: { vendorProfileId: user.marketProfile.id },
          include: {
            buyer: { select: { id: true, name: true, email: true } },
            listing: { select: { id: true, title: true } },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: {
                content: true,
                createdAt: true,
                senderId: true,
                readAt: true,
              },
            },
          },
          orderBy: { lastMessageAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({
    asVendor: vendorConvs,
    asBuyer: buyerConvs,
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getUser(session.user.email);
  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json();
  const { vendorProfileId, listingId, initialMessage } = body;

  if (!vendorProfileId || !initialMessage?.trim()) {
    return NextResponse.json(
      { error: "vendorProfileId and initialMessage required" },
      { status: 400 },
    );
  }

  // Prevent vendor from messaging themselves
  const vendorProfile = await prisma.marketProfile.findUnique({
    where: { id: vendorProfileId },
    select: { userId: true },
  });
  if (vendorProfile?.userId === user.id) {
    return NextResponse.json(
      { error: "You cannot message yourself." },
      { status: 403 },
    );
  }

  // Get or create conversation
  // Replace the upsert block with this:
  let conversation = await prisma.conversation.findFirst({
    where: {
      buyerId: user.id,
      vendorProfileId,
      listingId: listingId ?? null,
    },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        buyerId: user.id,
        vendorProfileId,
        listingId: listingId ?? null,
        lastMessageAt: new Date(),
      },
    });
  } else {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });
  }

  // Create the first message
  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: user.id,
      content: initialMessage.trim(),
    },
  });

  // Notify via SSE (write to global emitter)
  broadcastMessage(conversation.id, {
    ...message,
    senderName: session.user.name ?? "Someone",
  });

  return NextResponse.json({ conversation, message }, { status: 201 });
}

// Simple in-process emitter — works for single-instance deployments
// For multi-instance production, replace with Redis pub/sub
export const sseClients = new Map<string, Set<(data: string) => void>>();

export function broadcastMessage(conversationId: string, payload: object) {
  const clients = sseClients.get(conversationId);
  if (!clients) return;
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const send of clients) {
    try {
      send(data);
    } catch {
      /* client disconnected */
    }
  }
}
