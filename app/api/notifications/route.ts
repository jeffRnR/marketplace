// app/api/notifications/route.ts
// GET  — fetch notifications for current user (latest 30, unread first)
// POST — mark one or all as read

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

async function getUserId(email: string) {
  const u = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return u?.id ?? null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session.user.email);
  if (!userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where:   { userId },
      orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
      take:    30,
    }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(session.user.email);
  if (!userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  // Mark all as read
  if (body.markAllRead) {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data:  { isRead: true },
    });
    return NextResponse.json({ success: true });
  }

  // Mark one as read
  if (body.id) {
    await prisma.notification.updateMany({
      where: { id: body.id, userId },
      data:  { isRead: true },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Provide id or markAllRead" }, { status: 400 });
}