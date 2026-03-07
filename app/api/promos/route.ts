// app/api/promos/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

async function getAuthUser(email: string) {
  return prisma.user.findUnique({ where: { email }, select: { id: true } });
}

async function verifyEventOwner(eventId: number, userId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { createdById: true } });
  if (!event) return { ok: false, status: 404, error: "Event not found" };
  if (event.createdById !== userId) return { ok: false, status: 403, error: "Forbidden" };
  return { ok: true };
}

// GET — list promos for an event
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = Number(searchParams.get("eventId"));
    if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await getAuthUser(session.user.email);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const ownership = await verifyEventOwner(eventId, user.id);
    if (!ownership.ok) return NextResponse.json({ error: (ownership as any).error }, { status: (ownership as any).status });

    const promos = await prisma.promoCode.findMany({ where: { eventId }, orderBy: { createdAt: "desc" } });
    return NextResponse.json(promos);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — create promo
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await getAuthUser(session.user.email);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { eventId, code, discount, maxUses } = await req.json();
    if (!eventId || !code || !discount) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const ownership = await verifyEventOwner(Number(eventId), user.id);
    if (!ownership.ok) return NextResponse.json({ error: (ownership as any).error }, { status: (ownership as any).status });

    const promo = await prisma.promoCode.create({
      data: { eventId: Number(eventId), code: code.toUpperCase().trim(), discount, maxUses: Number(maxUses) || 50 },
    });
    return NextResponse.json(promo, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2002") return NextResponse.json({ error: "Promo code already exists for this event" }, { status: 409 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH — toggle active / update
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await getAuthUser(session.user.email);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { promoId, active, discount, maxUses } = await req.json();
    if (!promoId) return NextResponse.json({ error: "promoId required" }, { status: 400 });

    const existing = await prisma.promoCode.findUnique({ where: { id: promoId }, select: { eventId: true } });
    if (!existing) return NextResponse.json({ error: "Promo not found" }, { status: 404 });

    const ownership = await verifyEventOwner(existing.eventId, user.id);
    if (!ownership.ok) return NextResponse.json({ error: (ownership as any).error }, { status: (ownership as any).status });

    const promo = await prisma.promoCode.update({
      where: { id: promoId },
      data: {
        ...(active   !== undefined && { active: Boolean(active) }),
        ...(discount !== undefined && { discount }),
        ...(maxUses  !== undefined && { maxUses: Number(maxUses) }),
      },
    });
    return NextResponse.json(promo);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — remove promo
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await getAuthUser(session.user.email);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const promoId = searchParams.get("promoId");
    if (!promoId) return NextResponse.json({ error: "promoId required" }, { status: 400 });

    const existing = await prisma.promoCode.findUnique({ where: { id: promoId }, select: { eventId: true } });
    if (!existing) return NextResponse.json({ error: "Promo not found" }, { status: 404 });

    const ownership = await verifyEventOwner(existing.eventId, user.id);
    if (!ownership.ok) return NextResponse.json({ error: (ownership as any).error }, { status: (ownership as any).status });

    await prisma.promoCode.delete({ where: { id: promoId } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}