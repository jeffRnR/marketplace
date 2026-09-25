"use client";
// app/my-events/components/AnalyticsPanel.tsx

import React, { useEffect, useState } from "react";
import {
  Loader2, TrendingUp, TrendingDown, Users, DollarSign,
  BarChart2, Flame, Calendar, Target, AlertTriangle,
  CheckCircle, Copy, Check, ExternalLink,
} from "lucide-react";
import { ManagedEvent } from "../types";
import { SharePanel } from "@/components/SharePanel";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TicketBreakdown {
  id: string; type: string; price: string;
  capacity: number; sold: number; revenue: number; net: number; fillRate: number;
}
interface SalesDay     { date: string; orders: number; revenue: number }
interface TopBuyer     { name: string; email: string; spend: number; orders: number }
interface Referrer     { ref: string; count: number; pct: number; conversions: number }

interface Analytics {
  isRsvp: boolean; isPast: boolean; daysUntilEvent: number; daysSinceCreated: number;
  attendees: number; totalCapacity: number; spotsRemaining: number; fillRate: number;
  grossRevenue: number; commission: number; netRevenue: number;
  projectedFullRevenue: number; projectedNet: number; commissionRate: number;
  ticketBreakdown: TicketBreakdown[];
  salesTimeline: SalesDay[]; peakDay: SalesDay;
  salesVelocity: string; avgTicketsPerOrder: string; totalOrders: number;
  topBuyers: TopBuyer[];
  totalViews: number; referrers: Referrer[]; conversionRate: string;
}

// ── Small components ──────────────────────────────────────────────────────────

function Stat({ label, value, sub, trend }: {
  label: string; value: string | number; sub?: string; trend?: "up" | "down";
}) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 flex flex-col gap-2">
      <p className="text-2xl font-bold text-gray-100">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
      {sub && (
        <p className={`text-xs flex items-center gap-1 ${trend === "up" ? "text-green-400" : trend === "down" ? "text-red-400" : "text-gray-500"}`}>
          {trend === "up"   && <TrendingUp   className="w-3 h-3" />}
          {trend === "down" && <TrendingDown className="w-3 h-3" />}
          {sub}
        </p>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-500">{title}</p>
      {children}
    </div>
  );
}

function Alert({ type, msg }: { type: "warn" | "good"; msg: string }) {
  return (
    <div className={`flex items-start gap-2 rounded-xl px-4 py-3 border text-sm ${
      type === "warn"
        ? "bg-amber-900/20 border-amber-700/30 text-amber-300"
        : "bg-purple-600/10 border-purple-600/25 text-purple-300"
    }`}>
      {type === "warn" ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> : <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />}
      {msg}
    </div>
  );
}

function TicketBar({ t }: { t: TicketBreakdown }) {
  const pct   = t.capacity > 0 ? Math.round((t.sold / t.capacity) * 100) : 0;
  const color = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-purple-500" : "bg-gray-600";
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 flex flex-col gap-2">
      <div className="flex justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-200">{t.type}</p>
          <p className="text-xs text-gray-500">{t.sold} sold / {t.capacity} · {t.price} each</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-green-400">KES {t.net.toLocaleString()}</p>
          <p className="text-xs text-gray-600">{pct}% sold</p>
        </div>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-[3px]">
        <div className={`h-[3px] rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// Mini bar chart for sales timeline
function SalesChart({ data }: { data: SalesDay[] }) {
  if (data.length === 0) return <p className="text-xs text-gray-600 py-4 text-center">No sales yet.</p>;
  const max = Math.max(...data.map(d => d.orders), 1);
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-3">Orders per day</p>
      <div className="flex items-end gap-1 h-20">
        {data.map((d) => (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div
              className="w-full bg-purple-600 rounded-sm hover:bg-purple-400 transition"
              style={{ height: `${Math.round((d.orders / max) * 100)}%`, minHeight: "2px" }}
            />
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
              {d.date.slice(5)} · {d.orders} orders
            </span>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-gray-600">
        <span>{data[0]?.date.slice(5)}</span>
        <span>{data[data.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

// Referrer bar
function RefBar({ r, total }: { r: Referrer; total: number }) {
  const ICONS: Record<string, string> = {
    whatsapp: "💬", instagram: "📸", twitter: "🐦",
    facebook: "👍", tiktok: "🎵", direct: "🔗", other: "🌐",
  };
  return (
    <div className="flex items-center gap-3">
      <span className="text-base w-5 shrink-0">{ICONS[r.ref] ?? "🌐"}</span>
      <div className="flex-1">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-300 capitalize font-medium">{r.ref}</span>
          <span className="text-gray-500">{r.count} views · {r.pct}%</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-[3px]">
          <div className="h-[3px] rounded-full bg-purple-500" style={{ width: `${r.pct}%` }} />
        </div>
      </div>
    </div>
  );
}

// Share panel — generates ?ref= links per platform


// ── Main ──────────────────────────────────────────────────────────────────────

export function AnalyticsPanel({ event }: { event: ManagedEvent }) {
  const [data,    setData]    = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/events/${event.id}/analytics`)
      .then(r => r.ok ? r.json() : Promise.reject("Failed"))
      .then(setData)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [event.id]);

  if (loading) return (
    <div className="flex items-center justify-center py-16 gap-3 text-gray-500">
      <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
      <span className="text-sm">Loading analytics...</span>
    </div>
  );

  if (error || !data) return (
    <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/50 rounded-xl px-4 py-3">
      {error ?? "No data"}
    </p>
  );

  // ── Smart alerts ──────────────────────────────────────────────────────────
  const alerts: { type: "warn" | "good"; msg: string }[] = [];
  if (data.fillRate >= 90)
    alerts.push({ type: "warn", msg: `Only ${data.spotsRemaining} spot${data.spotsRemaining === 1 ? "" : "s"} left!` });
  if (data.fillRate < 30 && !data.isPast)
    alerts.push({ type: "warn", msg: `Fill rate is ${data.fillRate}%. Try sharing the event or a promo code.` });
  if (!data.isPast && data.daysUntilEvent <= 7 && data.daysUntilEvent > 0)
    alerts.push({ type: "warn", msg: `${data.daysUntilEvent} day${data.daysUntilEvent === 1 ? "" : "s"} to go — consider sending a reminder.` });
  if (data.netRevenue > 0 && !data.isRsvp)
    alerts.push({ type: "good", msg: `KES ${data.netRevenue.toLocaleString()} earned after 5% commission.` });
  if (parseFloat(data.conversionRate) > 8)
    alerts.push({ type: "good", msg: `${data.conversionRate}% conversion rate — your event page is performing well.` });
  if (data.totalViews > 0 && data.referrers[0])
    alerts.push({ type: "good", msg: `${data.referrers[0].ref} is your top traffic source (${data.referrers[0].pct}% of views).` });

  return (
    <div className="flex flex-col gap-8">

      {alerts.length > 0 && (
        <div className="flex flex-col gap-2">
          {alerts.map((a, i) => <Alert key={i} type={a.type} msg={a.msg} />)}
        </div>
      )}

      {/* Attendance & Capacity */}
      <Section title="Attendance & Capacity">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Confirmed attendees"  value={data.attendees} />
          <Stat label="Total capacity"       value={data.totalCapacity} sub={`${data.spotsRemaining} spots left`} />
          <Stat label="Fill rate"            value={`${data.fillRate}%`} trend={data.fillRate >= 50 ? "up" : "down"} sub={data.fillRate >= 80 ? "Excellent" : data.fillRate >= 50 ? "On track" : "Needs promotion"} />
          <Stat label="Sales velocity"       value={`${data.salesVelocity}/day`} sub={`Over ${data.daysSinceCreated} days`} trend="up" />
        </div>
      </Section>

      {/* Revenue */}
      {!data.isRsvp && (
        <Section title="Revenue">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Gross revenue"         value={`KES ${data.grossRevenue.toLocaleString()}`}        sub="Before platform fee" />
            <Stat label="Platform commission"   value={`KES ${data.commission.toLocaleString()}`}          trend="down" sub="5% platform fee" />
            <Stat label="Your net earnings"     value={`KES ${data.netRevenue.toLocaleString()}`}          trend="up"   sub="What you take home" />
            <Stat label="Projected at sell-out" value={`KES ${data.projectedNet.toLocaleString()}`}        trend="up"   sub="Net at full capacity" />
          </div>
          <div className="flex flex-col gap-2">
            {data.ticketBreakdown.filter(t => t.type !== "RSVP").map(t => <TicketBar key={t.id} t={t} />)}
          </div>
        </Section>
      )}

      {/* Sales Timeline */}
      <Section title="Sales Over Time">
        <SalesChart data={data.salesTimeline} />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <Stat label="Total orders"         value={data.totalOrders} />
          <Stat label="Avg tickets / order"  value={data.avgTicketsPerOrder} sub="Groups buying together" />
          {data.peakDay.date && (
            <Stat label="Peak sales day" value={data.peakDay.date.slice(5)} sub={`${data.peakDay.orders} orders`} trend="up" />
          )}
        </div>
      </Section>

      {/* Traffic & Referrers */}
      <Section title="Traffic & Referrers">
        <div className="grid grid-cols-2 gap-3 mb-1">
          <Stat label="Total page views"   value={data.totalViews} />
          <Stat label="Conversion rate"    value={`${data.conversionRate}%`} sub="Views → orders" trend={parseFloat(data.conversionRate) > 5 ? "up" : "down"} />
        </div>
        {data.referrers.length > 0 ? (
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 flex flex-col gap-3">
            {data.referrers.map(r => <RefBar key={r.ref} r={r} total={data.totalViews} />)}
          </div>
        ) : (
          <p className="text-xs text-gray-600 text-center py-4">No views recorded yet. Share your event to start tracking.</p>
        )}
      </Section>

      {/* Share Panel */}
      <Section title="Share Your Event">
        <SharePanel shortCode={event.shortCode} />
      </Section>

      {/* Top Buyers */}
      {data.topBuyers.length > 0 && (
        <Section title="Top Buyers">
          <div className="bg-gray-900 border border-gray-700 rounded-xl divide-y divide-gray-800">
            {data.topBuyers.map((b, i) => (
              <div key={b.email} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xs font-bold text-gray-600 w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-200 truncate">{b.name}</p>
                  <p className="text-xs text-gray-500 truncate">{b.email}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-green-400">KES {b.spend.toLocaleString()}</p>
                  <p className="text-xs text-gray-600">{b.orders} order{b.orders !== 1 ? "s" : ""}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Timeline */}
      <Section title="Timeline">
        <div className="grid grid-cols-2 gap-3">
          <Stat
            label={data.isPast ? "Event status" : "Days until event"}
            value={data.isPast ? "Completed" : `${data.daysUntilEvent}d`}
            sub={data.isPast ? "Stats are final" : data.daysUntilEvent <= 7 ? "Coming up soon" : "Plenty of time"}
            trend={data.isPast ? undefined : data.daysUntilEvent <= 3 ? "down" : "up"}
          />
          <Stat label="Days listed" value={data.daysSinceCreated} sub="Since event was published" />
        </div>
      </Section>

    </div>
  );
}