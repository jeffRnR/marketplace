// app/api/marketplace/profiles/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET — list all active profiles, with optional filters
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const search   = searchParams.get("search");
  const mine     = searchParams.get("mine");

  try {
    if (mine === "true") {
      const session = await getServerSession(authOptions);
      if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const profile = await prisma.marketProfile.findUnique({
        where:   { userId: (session.user as any).id },
        include: {
          listings:     { orderBy: { createdAt: "desc" } },
          applications: { include: { event: { select: { id: true, title: true, date: true } } }, orderBy: { createdAt: "desc" } },
          inquiries:    { orderBy: { createdAt: "desc" } },
          reviews:      { orderBy: { createdAt: "desc" } },
        },
      });
      return NextResponse.json(profile);
    }

    const profiles = await prisma.marketProfile.findMany({
      where: {
        isActive: true,
        ...(category ? { category } : {}),
        ...(search ? {
          OR: [
            { businessName: { contains: search, mode: "insensitive" } },
            { description:  { contains: search, mode: "insensitive" } },
            { tagline:      { contains: search, mode: "insensitive" } },
          ],
        } : {}),
      },
      include: {
        listings: { where: { isActive: true }, take: 3 },
        _count:   { select: { reviews: true, listings: true } },
      },
      orderBy: [{ isVerified: "desc" }, { rating: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(profiles);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — create a market profile
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  try {
    const body = await req.json();
    const { businessName, tagline, description, category, subCategory,
            location, phone, email, website, instagram, twitter, facebook,
            coverImage, logoImage } = body;

    if (!businessName?.trim() || !description?.trim() || !category?.trim() ||
        !location?.trim()     || !phone?.trim()        || !email?.trim())
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    const existing = await prisma.marketProfile.findUnique({ where: { userId } });
    if (existing)
      return NextResponse.json({ error: "You already have a market profile." }, { status: 409 });

    const profile = await prisma.marketProfile.create({
      data: { userId, businessName: businessName.trim(), tagline, description: description.trim(),
              category, subCategory, location: location.trim(), phone: phone.trim(),
              email: email.trim(), website, instagram, twitter, facebook, coverImage, logoImage },
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH — update own profile
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  try {
    const body    = await req.json();
    const profile = await prisma.marketProfile.findUnique({ where: { userId } });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const updated = await prisma.marketProfile.update({
      where: { userId },
      data:  {
        businessName: body.businessName ?? profile.businessName,
        tagline:      body.tagline      ?? profile.tagline,
        description:  body.description  ?? profile.description,
        category:     body.category     ?? profile.category,
        subCategory:  body.subCategory  ?? profile.subCategory,
        location:     body.location     ?? profile.location,
        phone:        body.phone        ?? profile.phone,
        email:        body.email        ?? profile.email,
        website:      body.website      ?? profile.website,
        instagram:    body.instagram    ?? profile.instagram,
        twitter:      body.twitter      ?? profile.twitter,
        facebook:     body.facebook     ?? profile.facebook,
        coverImage:   body.coverImage   ?? profile.coverImage,
        logoImage:    body.logoImage    ?? profile.logoImage,
        isActive:     body.isActive     ?? profile.isActive,
      },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}