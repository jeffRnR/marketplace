import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser?.email) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: currentUser.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      image,
      title,
      host,
      startDate,
      startTime,
      location,
      description,
      categoryId,
      isFree,
      tickets,
    } = body;

    if (!title || !startDate || !startTime || !location || !categoryId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const eventDateTime = new Date(`${startDate}T${startTime}`);

    const event = await prisma.$transaction(async (tx) => {
      const newEvent = await tx.event.create({
        data: {
          image: image || "",
          title,
          host: host || user.name || "Unknown Host",
          date: eventDateTime,
          time: startTime,
          location,
          description: description || "",
          categoryId: parseInt(categoryId),
          createdById: user.id,
          attendees: 0,
        },
      });

      if (!isFree && tickets && tickets.length > 0) {
        await tx.ticket.createMany({
          data: tickets.map((ticket: any) => ({
            eventId: newEvent.id,
            type: ticket.name,
            price: ticket.price,
            link: "",
          })),
        });
      }

      await tx.category.update({
        where: { id: parseInt(categoryId) },
        data: {
          eventsCount: { increment: 1 },
        },
      });

      return newEvent;
    });

    return NextResponse.json(
      {
        success: true,
        event,
        message: "Event created successfully!",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get("location");

    const events = await prisma.event.findMany({
      where: location
        ? {
            location: {
              contains: location,
              mode: "insensitive",
            },
          }
        : {},
      include: {
        category: true,
        tickets: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}