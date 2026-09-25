// app/api/events/[id]/analytics/route.ts
// All numbers come from the database. Nothing is simulated.

import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const COMMISSION = 0.05;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: eventId } = await params;
    if (!eventId?.trim())
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where:  { email: session.user.email },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const event = await prisma.event.findUnique({
      where:   { id: eventId },
      include: { tickets: true },
    });
    if (!event)                        return NextResponse.json({ error: "Event not found" }, { status: 404 });
    if (event.createdById !== user.id) return NextResponse.json({ error: "Forbidden" },      { status: 403 });

    // ── Fetch all real data in parallel ──────────────────────────────────
    const [orders, orderItems, views] = await Promise.all([
      prisma.order.findMany({
        where:   { eventId, status: "confirmed" },
        select:  { id: true, email: true, name: true, totalAmount: true, isRsvp: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.orderItem.findMany({
        where:  { order: { eventId, status: "confirmed" } },
        select: { ticketType: true, quantity: true, price: true, ticketId: true },
      }),
      prisma.eventView.findMany({
        where:  { eventId },
        select: { ref: true, createdAt: true },
      }),
    ]);

    // ── Basic event fields ────────────────────────────────────────────────
    const isRsvp          = event.tickets.length === 1 && event.tickets[0].type === "RSVP";
    const now             = Date.now();
    const daysUntilEvent  = Math.ceil((new Date(event.date).getTime() - now) / 86400000);
    const isPast          = daysUntilEvent < 0;
    const daysSinceCreated = Math.max(1, Math.ceil((now - new Date(event.createdAt).getTime()) / 86400000));

    const totalCapacity = event.tickets.reduce((s, t) => {
      const m = t.link.match(/^capacity:(\d+)$/);
      return s + (m ? parseInt(m[1]) : 0);
    }, 0);
    const spotsRemaining = Math.max(0, totalCapacity - event.attendees);
    const fillRate       = totalCapacity > 0 ? Math.round((event.attendees / totalCapacity) * 100) : 0;

    // ── Revenue (real, from orders) ───────────────────────────────────────
    const grossRevenue        = orders.reduce((s, o) => s + o.totalAmount, 0);
    const commission          = grossRevenue * COMMISSION;
    const netRevenue          = grossRevenue - commission;
    const projectedFullRevenue = event.tickets.reduce((s, t) => {
      if (t.type === "RSVP") return s;
      const price = parseFloat(t.price.replace(/[^0-9.]/g, "")) || 0;
      const cap   = (() => { const m = t.link.match(/^capacity:(\d+)$/); return m ? parseInt(m[1]) : 0; })();
      return s + price * cap;
    }, 0);
    const projectedNet = projectedFullRevenue * (1 - COMMISSION);

    // ── Ticket breakdown (real, from orderItems) ──────────────────────────
    const ticketBreakdown = event.tickets.map((t) => {
      const cap      = (() => { const m = t.link.match(/^capacity:(\d+)$/); return m ? parseInt(m[1]) : 0; })();
      const items    = orderItems.filter((i) => i.ticketId === t.id);
      const sold     = items.reduce((s, i) => s + i.quantity, 0);
      const revenue  = items.reduce((s, i) => {
        const p = parseFloat(i.price.replace(/[^0-9.]/g, "")) || 0;
        return s + p * i.quantity;
      }, 0);
      const net = revenue * (1 - COMMISSION);
      return {
        id: t.id, type: t.type, price: t.price,
        capacity: cap, sold, revenue, net,
        fillRate: cap > 0 ? Math.round((sold / cap) * 100) : 0,
      };
    });

    // ── Sales over time (daily, real) ─────────────────────────────────────
    const salesByDay: Record<string, { orders: number; revenue: number }> = {};
    for (const o of orders) {
      const day = o.createdAt.toISOString().slice(0, 10);
      if (!salesByDay[day]) salesByDay[day] = { orders: 0, revenue: 0 };
      salesByDay[day].orders++;
      salesByDay[day].revenue += o.totalAmount;
    }
    const salesTimeline = Object.entries(salesByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));

    // ── Peak sales day (real) ─────────────────────────────────────────────
    const peakDay = salesTimeline.reduce(
      (best, d) => d.orders > best.orders ? d : best,
      { date: "", orders: 0, revenue: 0 }
    );

    // ── Sales velocity (real) ─────────────────────────────────────────────
    const salesVelocity = (orders.length / daysSinceCreated).toFixed(1);

    // ── Avg tickets per order (real) ──────────────────────────────────────
    const totalItemsSold    = orderItems.reduce((s, i) => s + i.quantity, 0);
    const avgTicketsPerOrder = orders.length > 0
      ? (totalItemsSold / orders.length).toFixed(1)
      : "0";

    // ── Top buyers (real, by spend) ───────────────────────────────────────
    const buyerMap: Record<string, { name: string; email: string; spend: number; orders: number }> = {};
    for (const o of orders) {
      if (!buyerMap[o.email]) buyerMap[o.email] = { name: o.name, email: o.email, spend: 0, orders: 0 };
      buyerMap[o.email].spend  += o.totalAmount;
      buyerMap[o.email].orders += 1;
    }
    const topBuyers = Object.values(buyerMap)
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 5);

    // ── Page views & referrers (real, from EventView) ─────────────────────
    const totalViews = views.length;
    const refCounts: Record<string, number> = {};
    for (const v of views) {
      refCounts[v.ref] = (refCounts[v.ref] ?? 0) + 1;
    }
    const referrers = Object.entries(refCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([ref, count]) => ({
        ref,
        count,
        pct: totalViews > 0 ? Math.round((count / totalViews) * 100) : 0,
        // conversion: how many orders came after a view with this ref
        // approximated as: (orders / totalViews) * refViews
        conversions: totalViews > 0 ? Math.round((orders.length / totalViews) * count) : 0,
      }));

    // ── Conversion rate (real: orders / views) ────────────────────────────
    const conversionRate = totalViews > 0
      ? ((orders.length / totalViews) * 100).toFixed(1)
      : "0.0";

    return NextResponse.json({
      // Core
      isRsvp, isPast, daysUntilEvent, daysSinceCreated,

      // Attendance
      attendees: event.attendees, totalCapacity, spotsRemaining, fillRate,

      // Revenue
      grossRevenue, commission, netRevenue,
      projectedFullRevenue, projectedNet,
      commissionRate: COMMISSION * 100,
      ticketBreakdown,

      // Sales
      salesTimeline,
      peakDay,
      salesVelocity,
      avgTicketsPerOrder,
      totalOrders: orders.length,

      // Top buyers
      topBuyers,

      // Traffic & referrers
      totalViews,
      referrers,
      conversionRate,
    });
  } catch (err: any) {
    console.error("Analytics error:", err);
    return NextResponse.json({ error: err.message ?? "Internal server error" }, { status: 500 });
  }
}