// app/api/marketplace/applications/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET — applications for an event (owner) OR vendor's own applications
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");
  const mine    = searchParams.get("mine");

  try {
    if (eventId) {
      // Event owner fetching applications for their event
      const event = await prisma.event.findFirst({
        where: { id: Number(eventId), createdById: userId },
      });
      if (!event) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

      const apps = await prisma.vendorApplication.findMany({
        where:   { eventId: Number(eventId) },
        include: {
          profile: {
            select: { id: true, businessName: true, category: true, logoImage: true,
                      rating: true, reviewCount: true, location: true, phone: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(apps);
    }

    if (mine === "true") {
      const profile = await prisma.marketProfile.findUnique({ where: { userId } });
      if (!profile) return NextResponse.json([]);

      const apps = await prisma.vendorApplication.findMany({
        where:   { profileId: profile.id },
        include: {
          event: { select: { id: true, title: true, date: true, location: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(apps);
    }

    return NextResponse.json({ error: "Provide eventId or mine=true" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — vendor applies to an event
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  try {
    const body = await req.json();
    const { eventId, message, servicesOffered, proposedPrice } = body;

    if (!eventId || !message?.trim() || !servicesOffered?.trim())
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    const profile = await prisma.marketProfile.findUnique({ where: { userId } });
    if (!profile) return NextResponse.json({ error: "Create a market profile first." }, { status: 404 });

    const existing = await prisma.vendorApplication.findUnique({
      where: { profileId_eventId: { profileId: profile.id, eventId: Number(eventId) } },
    });
    if (existing)
      return NextResponse.json({ error: "You have already applied to this event." }, { status: 409 });

    const app = await prisma.vendorApplication.create({
      data: {
        profileId:       profile.id,
        eventId:         Number(eventId),
        message:         message.trim(),
        servicesOffered: servicesOffered.trim(),
        proposedPrice:   proposedPrice ? Number(proposedPrice) : null,
      },
    });

    return NextResponse.json(app, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH — event owner approves or rejects application
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  try {
    const body = await req.json();
    const { applicationId, status, ownerNote } = body;

    if (!applicationId || !["approved", "rejected"].includes(status))
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const app = await prisma.vendorApplication.findUnique({
      where:   { id: applicationId },
      include: { event: true },
    });
    if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (app.event.createdById !== userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const updated = await prisma.vendorApplication.update({
      where: { id: applicationId },
      data:  { status, ownerNote: ownerNote ?? null },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}