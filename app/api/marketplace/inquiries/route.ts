// app/api/marketplace/inquiries/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET — inquiries for the logged-in vendor's profile
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const profile = await prisma.marketProfile.findUnique({ where: { userId } });
  if (!profile) return NextResponse.json([]);

  const inquiries = await prisma.marketInquiry.findMany({
    where:   { profileId: profile.id },
    include: { listing: { select: { id: true, title: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(inquiries);
}

// POST — anyone sends an inquiry to a vendor
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { profileId, listingId, senderName, senderEmail, senderPhone, message } = body;

    if (!profileId || !senderName?.trim() || !senderEmail?.trim() || !message?.trim())
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    const inquiry = await prisma.marketInquiry.create({
      data: {
        profileId,
        listingId: listingId ?? null,
        senderName:  senderName.trim(),
        senderEmail: senderEmail.trim(),
        senderPhone: senderPhone?.trim() ?? null,
        message:     message.trim(),
      },
    });

    return NextResponse.json(inquiry, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH — vendor replies to / marks an inquiry
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  try {
    const body = await req.json();
    const { id, reply, status } = body;

    const profile = await prisma.marketProfile.findUnique({ where: { userId } });
    if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const inquiry = await prisma.marketInquiry.findFirst({
      where: { id, profileId: profile.id },
    });
    if (!inquiry) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.marketInquiry.update({
      where: { id },
      data:  {
        reply:  reply  ?? inquiry.reply,
        status: status ?? inquiry.status,
      },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}