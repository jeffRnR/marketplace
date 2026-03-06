// app/api/categories/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { events: true } }, // counts rows in EventCategory join table
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(
      categories.map((c) => ({
        id:          c.id,
        name:        c.name,
        eventsCount: c._count.events,
        icon:        c.icon,
        iconColor:   c.iconColor,
      }))
    );
  } catch (err) {
    console.error("GET /api/categories error:", err);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}