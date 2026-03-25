// app/api/events/[id]/analytics/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  // context: { params: { id: string } }
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await context.params;
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // const { params } = context;
    const eventId = Number(id);
    if (isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { tickets: true },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    if (event.createdById !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── Compute real stats from DB ────────────────────────────────────────
    const isRsvp = event.tickets.length === 1 && event.tickets[0].type === "RSVP";

    // Capacity from encoded link field "capacity:N"
    const totalCapacity = event.tickets.reduce((sum, t) => {
      const m = t.link.match(/^capacity:(\d+)$/);
      return sum + (m ? parseInt(m[1]) : 0);
    }, 0);

    // Revenue: sum of (price × attendees proportionally per ticket type)
    // Until a purchases table exists we distribute attendees evenly across ticket types
    const ticketCount = event.tickets.filter((t) => t.type !== "RSVP").length;
    const attendeesPerTicket = ticketCount > 0
      ? Math.floor(event.attendees / ticketCount)
      : 0;

    const grossRevenue = event.tickets.reduce((sum, t) => {
      if (t.type === "RSVP") return sum;
      const price = parseFloat(t.price.replace(/[^0-9.]/g, "")) || 0;
      return sum + price * attendeesPerTicket;
    }, 0);

    const PLATFORM_COMMISSION = 0.05;
    const commission = grossRevenue * PLATFORM_COMMISSION;
    const netRevenue = grossRevenue - commission;

    const fillRate = totalCapacity > 0
      ? Math.round((event.attendees / totalCapacity) * 100)
      : 0;

    const spotsRemaining = Math.max(0, totalCapacity - event.attendees);
    const daysUntilEvent = Math.ceil(
      (new Date(event.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    const isPast = daysUntilEvent < 0;

    // ── Simulated real-time stats ─────────────────────────────────────────
    // Replace with real tracking (e.g. Plausible, PostHog, or a custom views table)
    // seeded deterministically from eventId so they're stable per event
    const seed = eventId * 7;
    const viewsLast24h = Math.floor((seed % 80) + 20 + event.attendees * 0.4);
    const avgTimeOnPageSeconds = Math.floor(45 + (seed % 90));
    const uniqueVisitorsTotal = Math.floor(viewsLast24h * 4.2 + event.attendees * 2.1);
    const conversionRate = uniqueVisitorsTotal > 0
      ? ((event.attendees / uniqueVisitorsTotal) * 100).toFixed(1)
      : "0.0";
    const bounceRate = Math.floor(30 + (seed % 35));
    const returningVisitors = Math.floor(uniqueVisitorsTotal * 0.18);
    const shareClicks = Math.floor(viewsLast24h * 0.12);
    const checkoutAbandonment = Math.floor(25 + (seed % 30));
    const avgTicketsPerOrder = isRsvp ? 1 : (1.4 + (seed % 10) / 10).toFixed(1);

    // Revenue projections
    const projectedFullRevenue = event.tickets.reduce((sum, t) => {
      if (t.type === "RSVP") return sum;
      const price = parseFloat(t.price.replace(/[^0-9.]/g, "")) || 0;
      const cap = (() => { const m = t.link.match(/^capacity:(\d+)$/); return m ? parseInt(m[1]) : 0; })();
      return sum + price * cap;
    }, 0);
    const projectedNet = projectedFullRevenue * (1 - PLATFORM_COMMISSION);

    // Ticket breakdown per type
    const ticketBreakdown = event.tickets.map((t) => {
      const price = parseFloat(t.price.replace(/[^0-9.]/g, "")) || 0;
      const cap = (() => { const m = t.link.match(/^capacity:(\d+)$/); return m ? parseInt(m[1]) : 0; })();
      const sold = t.type === "RSVP" ? event.attendees : attendeesPerTicket;
      const revenue = price * sold;
      const net = revenue * (1 - PLATFORM_COMMISSION);
      return {
        id: t.id,
        type: t.type,
        price: t.price,
        capacity: cap,
        sold,
        revenue,
        net,
        fillRate: cap > 0 ? Math.round((sold / cap) * 100) : 0,
      };
    });

    // Velocity: tickets sold per day since event was created
    const daysSinceCreated = Math.max(
      1,
      Math.ceil((Date.now() - new Date(event.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    );
    const salesVelocity = (event.attendees / daysSinceCreated).toFixed(1);

    // Peak sales day (simulated)
    const peakDaysAgo = Math.floor(seed % 7) + 1;

    return NextResponse.json({
      // Core
      eventId,
      isRsvp,
      isPast,
      daysUntilEvent,

      // Attendance
      attendees: event.attendees,
      totalCapacity,
      spotsRemaining,
      fillRate,

      // Revenue
      grossRevenue,
      commission,
      netRevenue,
      projectedFullRevenue,
      projectedNet,
      commissionRate: PLATFORM_COMMISSION * 100,
      ticketBreakdown,

      // Traffic
      viewsLast24h,
      uniqueVisitorsTotal,
      avgTimeOnPageSeconds,
      bounceRate,
      returningVisitors,
      shareClicks,

      // Conversion
      conversionRate,
      checkoutAbandonment,
      avgTicketsPerOrder,

      // Velocity
      salesVelocity,
      daysSinceCreated,
      peakDaysAgo,
    });
  } catch (error: any) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: error?.message ?? "Internal server error" }, { status: 500 });
  }
}