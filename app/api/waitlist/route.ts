// app/api/waitlist/route.ts
// POST — add an email to the waitlist
// GET  — owner-only: list all signups (requires WAITLIST_ADMIN_KEY header)

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email, name, role } = await req.json();

    if (!email?.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    const existing = await prisma.waitlistEntry.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (existing) {
      // Don't reveal it's a duplicate — just return success
      return NextResponse.json({ success: true, position: existing.position });
    }

    // Get current count for position
    const count = await prisma.waitlistEntry.count();

    const entry = await prisma.waitlistEntry.create({
      data: {
        email:    email.trim().toLowerCase(),
        name:     name?.trim() || null,
        role:     role || "attendee",
        position: count + 1,
      },
    });

    return NextResponse.json({ success: true, position: entry.position }, { status: 201 });
  } catch (err: any) {
    console.error("Waitlist error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey !== process.env.WAITLIST_ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await prisma.waitlistEntry.findMany({
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ count: entries.length, entries });
}