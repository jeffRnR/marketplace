import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // adjust to your auth config path
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    // 1. Auth guard — only logged-in users can create events
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch the user from DB so we have their ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 3. Parse body
    const body = await req.json();
    const {
      image,
      title,
      host,
      startDate,
      startTime,
      endDate,   // stored in description suffix for now — schema has one date field
      endTime,
      country,
      location,
      description,
      requireApproval,
      isRsvp,        // true = RSVP (free), false = paid (has tickets)
      capacity,
      tickets,       // array of { name, price, capacity } — only when !isRsvp
      categoryId,
      lat,
      lng,
    } = body;

    // 4. Validate required fields
    if (!title || !startDate || !startTime || !location || !categoryId) {
      return NextResponse.json(
        { error: "Missing required fields: title, startDate, startTime, location, categoryId" },
        { status: 400 }
      );
    }

    if (!lat || !lng) {
      return NextResponse.json(
        { error: "Please select a valid venue with coordinates." },
        { status: 400 }
      );
    }

    // 5. Build date + time strings the schema expects
    // Schema: date DateTime, time String
    const eventDate = new Date(`${startDate}T${startTime}`);
    const timeLabel = `${startTime}${endDate && endTime ? ` – ${endTime} (${endDate})` : ""}`;

    // 6. Build mapUrl from coordinates
    const mapUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`;

    // 7. Build description with approval note if needed
    const fullDescription = requireApproval
      ? `${description}\n\n[Attendance requires host approval]`
      : description;

    // 8. Create event + tickets in a single transaction
    const event = await prisma.$transaction(async (tx) => {
      const newEvent = await tx.event.create({
        data: {
          image,
          title,
          host,
          date: eventDate,
          time: timeLabel,
          location: `${location}${country ? `, ${country}` : ""}`,
          description: fullDescription,
          mapUrl,
          categoryId: Number(categoryId),
          createdById: user.id,
          // tickets created below via nested writes
          tickets: {
            create: isRsvp
              ? // RSVP: create a single free "RSVP" ticket with a capacity link placeholder
                [
                  {
                    type: "RSVP",
                    price: "Free",
                    link: `capacity:${capacity ?? 0}`, // encode capacity in link field for now
                  },
                ]
              : // Paid: create one ticket per entry
                (tickets ?? []).map(
                  (t: { name: string; price: string; capacity: number }) => ({
                    type: t.name || "General",
                    price: String(t.price),
                    link: `capacity:${t.capacity ?? 0}`,
                  })
                ),
          },
        },
        include: { tickets: true, category: true },
      });

      return newEvent;
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
    const userId = searchParams.get("userId");

    const events = await prisma.event.findMany({
      where: {
        ...(categoryId ? { categoryId: Number(categoryId) } : {}),
        ...(userId ? { createdById: userId } : {}),
      },
      orderBy: { date: "asc" },
      include: {
        category: { select: { id: true, name: true, icon: true } },
        tickets: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("Fetch events error:", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}