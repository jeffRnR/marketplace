import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    // 1. Auth guard
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 2. Fetch user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    // 3. Parse body
    const body = await req.json();
    const {
      image,
      title,
      host,
      startDate,
      startTime,
      endDate,
      endTime,
      country,
      location,
      description,
      requireApproval,
      isRsvp,
      capacity,
      tickets,
      categoryIds, // number[] — replaces categoryId
      lat,
      lng,
    } = body;

    // 4. Validate
    if (!title || !startDate || !startTime || !location || !categoryIds?.length)
      return NextResponse.json(
        { error: "Missing required fields: title, startDate, startTime, location, categoryIds" },
        { status: 400 }
      );

    if (!lat || !lng)
      return NextResponse.json(
        { error: "Please select a valid venue with coordinates." },
        { status: 400 }
      );

    // 5. Build fields
    const eventDate      = new Date(`${startDate}T${startTime}`);
    const timeLabel      = `${startTime}${endDate && endTime ? ` – ${endTime} (${endDate})` : ""}`;
    const mapUrl         = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`;
    const fullDescription = requireApproval
      ? `${description}\n\n[Attendance requires host approval]`
      : description;

    // 6. Create event + tickets + category join rows in one transaction
    const event = await prisma.$transaction(async (tx) => {
      return tx.event.create({
        data: {
          image,
          title,
          host,
          date:        eventDate,
          time:        timeLabel,
          location:    `${location}${country ? `, ${country}` : ""}`,
          description: fullDescription,
          mapUrl,
          createdById: user.id,
          tickets: {
            create: isRsvp
              ? [{ type: "RSVP", price: "Free", link: `capacity:${capacity ?? 0}` }]
              : (tickets ?? []).map((t: { name: string; price: string; capacity: number }) => ({
                  type:  t.name || "General",
                  price: String(t.price),
                  link:  `capacity:${t.capacity ?? 0}`,
                })),
          },
          // Create one EventCategory row per selected category
          categories: {
            create: (categoryIds as number[]).map((id) => ({
              category: { connect: { id } },
            })),
          },
        },
        include: {
          tickets:    true,
          categories: { include: { category: true } },
        },
      });
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error: any) {
    console.error("Event creation error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");
    const userId     = searchParams.get("userId");

    const events = await prisma.event.findMany({
      where: {
        // Filter via join table instead of direct field
        ...(categoryId ? {
          categories: { some: { categoryId: Number(categoryId) } },
        } : {}),
        ...(userId ? { createdById: userId } : {}),
      },
      orderBy: { date: "asc" },
      include: {
        categories: { include: { category: true } },
        tickets:    true,
        createdBy:  { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("Fetch events error:", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}