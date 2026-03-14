// app/api/vending/applications/route.ts
// GET    — list applications (owner: all for a slot; vendor: own applications)
// POST   — vendor applies for a slot
// PATCH  — owner approves/rejects OR vendor initiates payment after approval

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { initiateStkPush } from "@/lib/intasend";

async function getSessionUser(email: string) {
  return prisma.user.findUnique({
    where:  { email },
    select: { id: true, marketProfile: { select: { id: true, businessName: true } } },
  });
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await getSessionUser(session.user.email);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const slotId = searchParams.get("slotId");
    const mine   = searchParams.get("mine") === "true";

    if (mine) {
      const apps = await prisma.slotApplication.findMany({
        where:   { userId: user.id },
        include: { slot: { include: { event: { select: { id: true, title: true, date: true } } } } },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(apps);
    }

    if (!slotId) return NextResponse.json({ error: "slotId or mine=true required" }, { status: 400 });

    const slot = await prisma.vendingSlot.findUnique({
      where:  { id: slotId },
      select: { eventId: true },
    });
    if (!slot) return NextResponse.json({ error: "Slot not found" }, { status: 404 });

    const event = await prisma.event.findUnique({
      where:  { id: slot.eventId },
      select: { createdById: true },
    });
    if (event?.createdById !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const apps = await prisma.slotApplication.findMany({
      where:   { slotId },
      orderBy: [{ hasPriority: "desc" }, { createdAt: "asc" }],
    });
    return NextResponse.json(apps);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST — vendor applies ─────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await getSessionUser(session.user.email);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const { slotId, businessName, contactName, contactEmail, contactPhone, description } = body;

    if (!slotId || !businessName?.trim() || !contactName?.trim() || !contactEmail?.trim() || !contactPhone?.trim() || !description?.trim()) {
      return NextResponse.json(
        { error: "Required: slotId, businessName, contactName, contactEmail, contactPhone, description" },
        { status: 400 }
      );
    }

    const slot = await prisma.vendingSlot.findUnique({
      where:   { id: slotId },
      include: { event: { select: { createdById: true } } },
    });
    if (!slot)                  return NextResponse.json({ error: "Slot not found" }, { status: 404 });
    if (slot.status !== "open") return NextResponse.json({ error: "This slot is no longer accepting applications." }, { status: 409 });

    // ── Block event owner from applying to their own slots ──────────────────
    if (slot.event.createdById === user.id) {
      return NextResponse.json(
        { error: "You cannot apply to vending slots on your own event." },
        { status: 403 }
      );
    }

    const existing = await prisma.slotApplication.findUnique({
      where: { slotId_userId: { slotId, userId: user.id } },
    });
    if (existing) return NextResponse.json({ error: "You have already applied for this slot." }, { status: 409 });

    const hasPriority     = !!user.marketProfile;
    const marketProfileId = user.marketProfile?.id ?? null;

    const application = await prisma.slotApplication.create({
      data: {
        slotId, userId: user.id, marketProfileId, hasPriority,
        businessName:  businessName.trim(),
        contactName:   contactName.trim(),
        contactEmail:  contactEmail.trim(),
        contactPhone:  contactPhone.trim(),
        description:   description.trim(),
        status:        "pending",
      },
    });

    return NextResponse.json({ application }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PATCH — approve/reject (owner) or pay (vendor) ───────────────────────────

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await getSessionUser(session.user.email);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const { applicationId, action, ownerNote } = body;

    if (!applicationId || !action) {
      return NextResponse.json({ error: "applicationId and action required" }, { status: 400 });
    }

    const application = await prisma.slotApplication.findUnique({
      where:   { id: applicationId },
      include: { slot: { include: { event: { select: { createdById: true, title: true } } } } },
    });
    if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    // ── Owner: approve / reject ───────────────────────────────────────────────
    if (action === "approve" || action === "reject") {
      if (application.slot.event.createdById !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (application.status !== "pending") {
        return NextResponse.json(
          { error: `Cannot ${action} an application with status: ${application.status}` },
          { status: 409 }
        );
      }
      const updated = await prisma.slotApplication.update({
        where: { id: applicationId },
        data: {
          status:    action === "approve" ? "approved" : "rejected",
          ownerNote: ownerNote?.trim() ?? null,
        },
      });
      return NextResponse.json({ application: updated });
    }

    // ── Vendor: pay ───────────────────────────────────────────────────────────
    if (action === "pay") {
      if (application.userId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (application.status !== "approved") {
        return NextResponse.json(
          { error: "Application must be approved before payment." },
          { status: 409 }
        );
      }

      const slot   = application.slot;
      const txRef  = randomUUID();
      const amount = slot.price;

      await prisma.paymentRecord.create({
        data: {
          txRef,
          type:              "vending_slot",
          amount,
          currency:          slot.currency,
          phone:             application.contactPhone,
          status:            "pending",
          slotApplicationId: applicationId,
        },
      });

      const nameParts = application.contactName.trim().split(" ");
      const firstName = nameParts[0] ?? application.contactName;
      const lastName  = nameParts.slice(1).join(" ") || firstName;

      const stkResult = await initiateStkPush({
        phone:     application.contactPhone,
        amount,
        currency:  slot.currency,
        apiRef:    txRef,
        narrative: `Vending slot — ${slot.title} @ ${slot.event?.title ?? "event"}`,
        email:     application.contactEmail,
        firstName,
        lastName,
      });

      if (!stkResult.success) {
        await prisma.paymentRecord.update({
          where: { txRef },
          data:  { status: "failed" },
        });
        return NextResponse.json(
          { error: `Could not initiate payment: ${stkResult.message}` },
          { status: 502 }
        );
      }

      if (stkResult.invoiceId) {
        await prisma.paymentRecord.update({
          where: { txRef },
          data:  { flwRef: stkResult.invoiceId },
        });
      }

      await prisma.slotApplication.update({
        where: { id: applicationId },
        data:  { status: "paid" },
      });

      return NextResponse.json({
        success: true,
        txRef,
        amount,
        message: "Check your phone and enter your M-Pesa PIN to complete payment.",
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error("PATCH /api/vending/applications:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}