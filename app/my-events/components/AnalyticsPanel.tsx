"use client";
// app/my-events/components/AnalyticsPanel.tsx

import React, { useEffect, useState } from "react";
import {
  AlertTriangle, CheckCircle, Loader2, TrendingUp, TrendingDown,
  Eye, Users, Clock, Target, Share2, ShoppingCart, RotateCcw,
  Zap, Activity, DollarSign, Calendar, BarChart2, Flame,
} from "lucide-react";
import { ManagedEvent } from "../types";

interface Analytics {
  isRsvp: boolean; isPast: boolean; daysUntilEvent: number;
  attendees: number; totalCapacity: number; spotsRemaining: number; fillRate: number;
  grossRevenue: number; commission: number; netRevenue: number;
  projectedFullRevenue: number; projectedNet: number; commissionRate: number;
  ticketBreakdown: {
    id: number; type: string; price: string;
    capacity: number; sold: number; revenue: number; net: number; fillRate: number;
  }[];
  viewsLast24h: number; uniqueVisitorsTotal: number; avgTimeOnPageSeconds: number;
  bounceRate: number; returningVisitors: number; shareClicks: number;
  conversionRate: string; checkoutAbandonment: number; avgTicketsPerOrder: string | number;
  salesVelocity: string; daysSinceCreated: number; peakDaysAgo: number;
}

// ── Insight card ──────────────────────────────────────────────────────────
function Insight({
  icon: Icon, label, value, sub, trend,
}: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; trend?: "up" | "down" | "neutral";
}) {
  return (
    <div className="shadow-md shadow-black bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-2xl p-4 flex flex-col gap-3 transition duration-300">
      <Icon className="w-4 h-4 text-purple-400" />
      <div>
        <p className="text-gray-300 font-bold text-[1.5rem] leading-tight">{value}</p>
        <p className="text-gray-400 text-sm mt-0.5">{label}</p>
        {sub && (
          <p className={`text-xs mt-1 flex items-center gap-1 ${
            trend === "up" ? "text-green-400" : trend === "down" ? "text-red-400" : "text-gray-500"
          }`}>
            {trend === "up" && <TrendingUp className="w-3 h-3" />}
            {trend === "down" && <TrendingDown className="w-3 h-3" />}
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Section ────────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">{title}</p>
      {children}
    </div>
  );
}

// ── Alert ─────────────────────────────────────────────────────────────────
function Alert({ type, message }: { type: "warn" | "good"; message: string }) {
  return (
    <div className={`flex items-start gap-3 rounded-lg px-4 py-3 border ${
      type === "warn"
        ? "bg-orange-900/20 border-orange-700/40 text-orange-300"
        : "bg-purple-900/30 border-purple-700/50 text-purple-300"
    }`}>
      {type === "warn"
        ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        : <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />}
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ── Ticket fill bar ────────────────────────────────────────────────────────
function TicketBar({ label, sold, total, net, price }: {
  label: string; sold: number; total: number; net: number; price: string;
}) {
  const pct = total > 0 ? Math.round((sold / total) * 100) : 0;
  const barColor = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-purple-500" : "bg-gray-600";
  return (
    <div className="bg-gray-700/40 border border-gray-700 rounded-lg px-4 py-3 flex flex-col gap-2.5">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-semibold text-gray-300">{label}</p>
          <p className="text-xs text-gray-500 mt-0.5">{sold} sold of {total} · {price} each</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-green-400">KES {net.toLocaleString()}</p>
          <p className="text-xs text-gray-600">net · {pct}% sold</p>
        </div>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-[3px]">
        <div className={`h-[3px] rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
export function AnalyticsPanel({ event }: { event: ManagedEvent }) {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/events/${event.id}/analytics`);
        if (!res.ok) throw new Error("Failed to load analytics");
        setData(await res.json());
      } catch (e: any) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, [event.id]);

  if (loading) return (
    <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
      <Loader2 className="w-6 h-6 animate-spin" />
      <span className="text-sm">Loading insights...</span>
    </div>
  );

  if (error || !data) return (
    <p className="text-sm text-red-400 py-8 text-center">{error ?? "No data available"}</p>
  );

  const avgTime = data.avgTimeOnPageSeconds >= 60
    ? `${Math.floor(data.avgTimeOnPageSeconds / 60)}m ${data.avgTimeOnPageSeconds % 60}s`
    : `${data.avgTimeOnPageSeconds}s`;

  const alerts: { type: "warn" | "good"; message: string }[] = [];
  if (data.fillRate >= 90)
    alerts.push({ type: "warn", message: `Only ${data.spotsRemaining} spot${data.spotsRemaining === 1 ? "" : "s"} left — your event is almost full.` });
  if (data.fillRate < 30 && !data.isPast)
    alerts.push({ type: "warn", message: `Fill rate is ${data.fillRate}%. Try sharing the event or creating a promo code.` });
  if (data.checkoutAbandonment > 45)
    alerts.push({ type: "warn", message: `${data.checkoutAbandonment}% of people left checkout. A promo code might help.` });
  if (parseFloat(data.conversionRate) > 8)
    alerts.push({ type: "good", message: `${data.conversionRate}% conversion rate — your event page is performing really well.` });
  if (!data.isPast && data.daysUntilEvent <= 7 && data.daysUntilEvent > 0)
    alerts.push({ type: "warn", message: `Only ${data.daysUntilEvent} day${data.daysUntilEvent === 1 ? "" : "s"} to go! Send your attendees a reminder.` });
  if (data.netRevenue > 0 && !data.isRsvp)
    alerts.push({ type: "good", message: `KES ${data.netRevenue.toLocaleString()} earned so far — after the 5% platform commission.` });
  if (data.avgTimeOnPageSeconds > 90)
    alerts.push({ type: "good", message: `People spend ${avgTime} on average reading your event page — that's strong engagement.` });

  return (
    <div className="flex flex-col gap-8">

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="flex flex-col gap-2">
          {alerts.map((a, i) => <Alert key={i} type={a.type} message={a.message} />)}
        </div>
      )}

      {/* Traffic */}
      <Section title="Traffic & Engagement">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Insight icon={Eye}       label="Views (last 24h)"    value={data.viewsLast24h}                          trend="up"  sub="Live page traffic" />
          <Insight icon={Users}     label="Unique visitors"      value={data.uniqueVisitorsTotal.toLocaleString()}  trend="up"  sub="All time" />
          <Insight icon={Clock}     label="Avg. time on page"    value={avgTime}                                    trend={data.avgTimeOnPageSeconds > 60 ? "up" : "down"} sub="Time spent reading" />
          <Insight icon={RotateCcw} label="Returning visitors"   value={data.returningVisitors}                     sub="Came back to look again" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Insight icon={Share2} label="Share clicks"  value={data.shareClicks} sub="People who shared the event" />
          <Insight icon={Zap}    label="Bounce rate"   value={`${data.bounceRate}%`} trend={data.bounceRate > 60 ? "down" : "neutral"} sub="Left without interacting" />
        </div>
      </Section>

      {/* Conversion */}
      <Section title="Conversion & Sales">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Insight icon={Target}       label="Conversion rate"      value={`${data.conversionRate}%`}      trend={parseFloat(data.conversionRate) > 5 ? "up" : "down"} sub="Viewers who registered" />
          <Insight icon={ShoppingCart} label="Checkout abandonment" value={`${data.checkoutAbandonment}%`} trend={data.checkoutAbandonment > 40 ? "down" : "neutral"}  sub="Left before paying" />
          <Insight icon={BarChart2}    label="Avg. tickets / order" value={data.avgTicketsPerOrder}                                                                       sub="Groups buying together" />
          <Insight icon={Flame}        label="Sales velocity"       value={`${data.salesVelocity}/day`}    trend="up" sub={`Over ${data.daysSinceCreated} days`} />
        </div>
      </Section>

      {/* Revenue */}
      {!data.isRsvp && (
        <Section title="Revenue">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Insight icon={DollarSign} label="Gross revenue"         value={`KES ${data.grossRevenue.toLocaleString()}`}      sub="Before platform fee" />
            <Insight icon={Activity}   label="Platform commission"   value={`KES ${data.commission.toLocaleString()}`}        trend="down" sub="5% goes to the platform" />
            <Insight icon={TrendingUp} label="Your net earnings"     value={`KES ${data.netRevenue.toLocaleString()}`}        trend="up"   sub="What you take home" />
            <Insight icon={BarChart2}  label="Projected at sell-out" value={`KES ${data.projectedNet.toLocaleString()}`}      trend="up"   sub="Net at full capacity" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">Per ticket type</p>
            {data.ticketBreakdown.filter((t) => t.type !== "RSVP").map((t) => (
              <TicketBar key={t.id} label={t.type} sold={t.sold} total={t.capacity} net={t.net} price={t.price} />
            ))}
          </div>
        </Section>
      )}

      {/* Attendance */}
      <Section title="Attendance & Capacity">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Insight icon={Users}    label="Confirmed attendees" value={data.attendees} />
          <Insight icon={BarChart2} label="Total capacity"     value={data.totalCapacity} sub={`${data.spotsRemaining} spots left`} />
          <Insight icon={Zap}      label="Fill rate"           value={`${data.fillRate}%`} trend={data.fillRate >= 50 ? "up" : "down"} sub={data.fillRate >= 80 ? "Excellent" : data.fillRate >= 50 ? "On track" : "Needs promotion"} />
          <Insight icon={Flame}    label="Sales velocity"      value={`${data.salesVelocity}/day`} sub={`${data.daysSinceCreated} days listed`} trend="up" />
        </div>
      </Section>

      {/* Timeline */}
      <Section title="Timeline">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <Insight
            icon={Calendar}
            label={data.isPast ? "Event status" : "Days until event"}
            value={data.isPast ? "Completed" : `${data.daysUntilEvent} days`}
            sub={data.isPast ? "Stats are final" : data.daysUntilEvent <= 7 ? "Coming up soon!" : "Plenty of time to sell"}
            trend={data.isPast ? "neutral" : data.daysUntilEvent <= 3 ? "down" : "up"}
          />
          <Insight icon={Activity} label="Peak sales day" value={`${data.peakDaysAgo}d ago`}  sub="Most tickets sold in one day" />
          <Insight icon={Clock}    label="Days listed"    value={data.daysSinceCreated}         sub="Since event was published" />
        </div>
      </Section>

      <p className="text-xs text-gray-600 text-center">
        Traffic metrics are simulated · Integrate Plausible or PostHog for real-time analytics
      </p>
    </div>
  );
}