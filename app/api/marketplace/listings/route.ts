// app/api/marketplace/listings/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET — listings for a profile
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const profileId = searchParams.get("profileId");
  if (!profileId) return NextResponse.json({ error: "profileId required" }, { status: 400 });

  const listings = await prisma.marketListing.findMany({
    where:   { profileId, isActive: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(listings);
}

// POST — create a listing
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  try {
    const profile = await prisma.marketProfile.findUnique({ where: { userId } });
    if (!profile) return NextResponse.json({ error: "Create a market profile first." }, { status: 404 });

    const body = await req.json();
    const { title, description, category, priceType, price, images, tags } = body;

    if (!title?.trim() || !description?.trim() || !category || !priceType)
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    const listing = await prisma.marketListing.create({
      data: {
        profileId:   profile.id,
        title:       title.trim(),
        description: description.trim(),
        category,
        priceType,
        price:       price ? Number(price) : null,
        images:      images ?? [],
        tags:        tags   ?? [],
      },
    });

    return NextResponse.json(listing, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH — update a listing
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  try {
    const body      = await req.json();
    const { id, ...updates } = body;

    const profile = await prisma.marketProfile.findUnique({ where: { userId } });
    if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const listing = await prisma.marketListing.findFirst({ where: { id, profileId: profile.id } });
    if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

    const updated = await prisma.marketListing.update({
      where: { id },
      data:  {
        title:       updates.title       ?? listing.title,
        description: updates.description ?? listing.description,
        category:    updates.category    ?? listing.category,
        priceType:   updates.priceType   ?? listing.priceType,
        price:       updates.price !== undefined ? Number(updates.price) : listing.price,
        images:      updates.images      ?? listing.images,
        tags:        updates.tags        ?? listing.tags,
        isActive:    updates.isActive    ?? listing.isActive,
      },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — remove a listing
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const profile = await prisma.marketProfile.findUnique({ where: { userId } });
    if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.marketListing.deleteMany({ where: { id, profileId: profile.id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}