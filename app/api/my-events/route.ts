// app/api/my-events/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const events = await prisma.event.findMany({
      where: { createdById: user.id },
      orderBy: { date: "desc" },
      include: {
        tickets: true,
        // many-to-many via join table
        categories: { include: { category: true } },
      },
    });

    const eventsWithStats = events.map((event) => {
      const isRsvp =
        event.tickets.length === 1 && event.tickets[0].type === "RSVP";

      const totalCapacity = event.tickets.reduce((sum, t) => {
        const match = t.link.match(/^capacity:(\d+)$/);
        return sum + (match ? parseInt(match[1]) : 0);
      }, 0);

      const ticketRevenue = isRsvp
        ? 0
        : event.tickets.reduce((sum, t) => {
            const price = parseFloat(t.price.replace(/[^0-9.]/g, "")) || 0;
            return sum + price;
          }, 0);

      const isPast = new Date(event.date) < new Date();

      const formattedDate = new Date(event.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      // Flatten join table rows into plain category objects
      const categories = event.categories.map((ec) => ({
        id: ec.category.id,
        name: ec.category.name,
        icon: ec.category.icon,
        iconColor: ec.category.iconColor,
      }));

      return {
        id: event.id,
        title: event.title,
        image: event.image,
        date: formattedDate,
        rawDate: event.date,
        time: event.time,
        location: event.location,
        description: event.description,
        host: event.host,
        attendees: event.attendees,
        mapUrl: event.mapUrl,
        categories, // array — replaces single category
        tickets: event.tickets.map((t) => ({
          id: t.id,
          type: t.type,
          price: t.price,
          link: t.link,
          isActive: t.isActive,
          startsAt: t.startsAt ? t.startsAt.toISOString() : null,
          endsAt: t.endsAt ? t.endsAt.toISOString() : null,
          capacity: (() => {
            const match = t.link.match(/^capacity:(\d+)$/);
            return match ? parseInt(match[1]) : 0;
          })(),
        })),
        stats: {
          isRsvp,
          totalCapacity,
          ticketRevenue,
          isPast,
          isUpcoming: !isPast,
          ticketTypes: event.tickets.length,
          spotsRemaining: Math.max(0, totalCapacity - event.attendees),
          fillRate:
            totalCapacity > 0
              ? Math.round((event.attendees / totalCapacity) * 100)
              : 0,
        },
      };
    });

    const totalRevenue = eventsWithStats.reduce(
      (s, e) => s + e.stats.ticketRevenue,
      0,
    );
    const totalAttendees = eventsWithStats.reduce((s, e) => s + e.attendees, 0);
    const upcomingCount = eventsWithStats.filter(
      (e) => e.stats.isUpcoming,
    ).length;
    const pastCount = eventsWithStats.filter((e) => e.stats.isPast).length;

    return NextResponse.json({
      events: eventsWithStats,
      summary: {
        totalEvents: events.length,
        upcomingCount,
        pastCount,
        totalAttendees,
        totalRevenue,
      },
    });
  } catch (error: any) {
    console.error("My events fetch error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const eventId = Number(searchParams.get("eventId"));
    if (!eventId)
      return NextResponse.json({ error: "Event ID required" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { createdById: true },
    });
    if (!event)
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    if (event.createdById !== user.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.event.delete({ where: { id: eventId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete event error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Internal server error" },
      { status: 500 },
    );
  }
}
