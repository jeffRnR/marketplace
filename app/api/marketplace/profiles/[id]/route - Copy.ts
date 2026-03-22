// app/api/marketplace/profiles/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const profile = await prisma.marketProfile.findUnique({
    where:   { id },
    include: {
      listings: { where: { isActive: true }, orderBy: { createdAt: "desc" } },
      reviews:  { orderBy: { createdAt: "desc" } },
      applications: {
        where:   { status: "approved" },
        include: { event: { select: { id: true, title: true, date: true, location: true, image: true } } },
      },
    },
  });

  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(profile);
}