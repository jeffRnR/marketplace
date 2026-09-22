
"use client";
// app/my-events/components/EventRow.tsx

import React, { useState } from "react";
import Link from "next/link";
import {
  CalendarDays, MapPin, Clock, Users, TrendingUp, Package,
  Eye, BarChart2, Trash2, Loader2, Tag, Pencil, Zap,
  Activity, ChevronDown, Ticket, Store, ScanLine,
} from "lucide-react";
import { ManagedEvent, DeleteState, TicketStat } from "../types";
import { FillBar }        from "./FillBar";
import { AttendeePanel }  from "./AttendeePanel";
import { RevenuePanel }   from "./RevenuePanel";
import { PromoPanel }     from "./PromoPanel";
import { AnalyticsPanel } from "./AnalyticsPanel";
import { EditEventModal } from "./EditEventModal";
import { TicketsPanel }   from "./TicketsPanel";
import VendorsPanel       from "./VendorsPanel";
import { ScanPanel }      from "./ScanPanel";

type DetailTab = "overview" | "analytics" | "attendees" | "revenue" | "tickets" | "promos" | "vendors" | "scan";

const TABS: { key: DetailTab; label: string; icon: React.ElementType }[] = [
  { key: "overview",  label: "Overview",  icon: BarChart2  },
  { key: "analytics", label: "Insights",  icon: Activity   },
  { key: "attendees", label: "Attendees", icon: Users      },
  { key: "revenue",   label: "Revenue",   icon: TrendingUp },
  { key: "tickets",   label: "Tickets",   icon: Ticket     },
  { key: "promos",    label: "Promos",    icon: Tag        },
  { key: "vendors",   label: "Vendors",   icon: Store      },
  { key: "scan",      label: "Scan",      icon: ScanLine   },
];

export function EventRow({
  event: initialEvent,
  onDelete,
}: {
  event: ManagedEvent;
  onDelete: (id: string) => void;
}) {
  const [event,       setEvent]       = useState(initialEvent);
  const [deleteState, setDeleteState] = useState<DeleteState>("idle");
  const [expanded,    setExpanded]    = useState(false);
  const [tab,         setTab]         = useState<DetailTab>("overview");
  const [showEdit,    setShowEdit]    = useState(false);
  const isPast = event.stats.isPast;

  const handleDelete = async () => {
    if (deleteState === "idle")       { setDeleteState("confirming"); return; }
    if (deleteState === "confirming") {
      setDeleteState("deleting");
      await onDelete(event.id);
      setDeleteState("idle");
    }
  };

  const handleTicketsChanged = (tickets: TicketStat[]) => {
    const isRsvp        = tickets.length === 1 && tickets[0].type === "RSVP";
    const totalCapacity = tickets.reduce((s, t) => s + t.capacity, 0);
    const ticketRevenue = isRsvp
      ? 0
      : tickets.reduce((s, t) => {
          const price = parseFloat(t.price.replace(/[^0-9.]/g, "")) || 0;
          return s + price;
        }, 0);
    const spotsRemaining = Math.max(0, totalCapacity - event.attendees);
    const fillRate       = totalCapacity > 0 ? Math.round((event.attendees / totalCapacity) * 100) : 0;

    setEvent((prev) => ({
      ...prev,
      tickets,
      stats: {
        ...prev.stats,
        isRsvp,
        totalCapacity,
        ticketRevenue,
        ticketTypes: tickets.length,
        spotsRemaining,
        fillRate,
      },
    }));
  };

  return (
    <>
      <div className={`rounded-2xl overflow-hidden border transition duration-300 ${
        isPast
          ? "bg-gray-900 border-gray-400/10 opacity-70"
          : "bg-gray-900 border-gray-400/20 hover:border-[var(--brand-purple)]/40"
      }`}>

        {/* Hero image */}
        <div className="relative h-44 sm:h-56 overflow-hidden">
          <img
            src={event.image}
            alt={event.title}
            className="w-full h-full object-cover"
            style={{ filter: isPast ? "grayscale(30%) brightness(0.55)" : "brightness(0.65)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent" />

          <div className="absolute top-3 right-3 flex items-center gap-2 flex-wrap justify-end">
            {event.stats.isRsvp
              ? <Badge variant="blue">RSVP</Badge>
              : <Badge variant="purple">Paid</Badge>}
            {event.stats.spotsRemaining === 0 && <Badge variant="red">Sold Out</Badge>}
            {event.stats.fillRate >= 90 && event.stats.spotsRemaining > 0 && <Badge variant="orange">Almost Full</Badge>}
            {isPast && <Badge variant="gray">Past</Badge>}
          </div>

          <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
            <h3 className="text-[var(--foreground)] font-bold text-2xl leading-tight drop-shadow">
              {event.title}
            </h3>
            <p className="text-[var(--muted)] text-sm mt-0.5">
              Hosted by <span className="text-purple-600 font-medium">{event.host}</span>
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-4">

          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-[var(--muted)]">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 opacity-60" />{event.date}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 opacity-60" />{event.time}
            </span>
            <span className="flex items-center gap-1.5 min-w-0">
              <MapPin className="w-3.5 h-3.5 opacity-60 shrink-0" />
              <span className="truncate">{event.location}</span>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={Users}    iconColor="text-[var(--brand-purple)]" label="Attending"    value={String(event.attendees)} />
            <StatCard icon={Package}  iconColor="text-[var(--muted)]"        label="Capacity"     value={String(event.stats.totalCapacity)} />
            <StatCard
              icon={Ticket}
              iconColor="text-[var(--muted)]"
              label="Spots left"
              value={event.stats.spotsRemaining === 0 ? "Sold out" : String(event.stats.spotsRemaining)}
              valueColor={
                event.stats.spotsRemaining === 0  ? "text-red-400"
                : event.stats.spotsRemaining < 20 ? "text-orange-400"
                :                                   "text-[var(--foreground)]"
              }
            />
            {event.stats.isRsvp
              ? <StatCard icon={Zap}        iconColor="text-[var(--brand-purple)]" label="Type"         value="Free RSVP" />
              : <StatCard icon={TrendingUp} iconColor="text-[var(--brand-green)]"  label="Est. revenue" value={`KES ${event.stats.ticketRevenue.toLocaleString()}`} valueColor="text-[var(--brand-green)]" />
            }
          </div>

          <FillBar rate={event.stats.fillRate} />

          {event.description && (
            <p className="text-sm text-[var(--muted)] leading-relaxed line-clamp-2">{event.description}</p>
          )}

          {/* Mobile actions */}
          <div className="flex flex-col gap-2 sm:hidden">
            <div className="grid grid-cols-2 gap-2">
              <Link href={`/events/${event.id}`} className="contents">
                <ActionBtn icon={Eye} label="View Event" fullWidth />
              </Link>
              <ActionBtn icon={Pencil} label="Edit" onClick={() => setShowEdit(true)} fullWidth />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setExpanded((v) => !v)}
                className={`flex items-center justify-center gap-2 w-full text-sm font-semibold rounded-xl px-3 py-2.5 border transition duration-300 ${
                  expanded
                    ? "bg-purple-700 border-purple-600 text-white"
                    : "bg-purple-600 border-purple-600 text-white hover:bg-purple-700"
                }`}
              >
                <BarChart2 className="w-4 h-4 shrink-0" />
                <span>{expanded ? "Close" : "Manage"}</span>
                <ChevronDown className={`w-4 h-4 shrink-0 ml-auto transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
              </button>

              {deleteState === "confirming" ? (
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setDeleteState("idle")}
                    className="flex items-center justify-center text-xs font-medium rounded-xl py-2.5 border border-gray-400/50 text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)] transition duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex items-center justify-center gap-1 text-xs font-semibold rounded-xl py-2.5 bg-red-700 border border-red-600 text-white hover:bg-red-800 transition duration-300"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Sure?
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleDelete}
                  disabled={deleteState === "deleting"}
                  className="flex items-center justify-center gap-2 w-full text-sm font-medium rounded-xl px-3 py-2.5 border border-gray-400/50 text-[var(--muted)] hover:border-red-600 hover:text-red-400 transition duration-300 disabled:opacity-40"
                >
                  {deleteState === "deleting"
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Trash2 className="w-4 h-4" />
                  }
                  Delete
                </button>
              )}
            </div>
          </div>

          {/* Desktop actions */}
          <div className="hidden sm:flex items-center gap-2 flex-wrap">
            <Link href={`/events/${event.id}`}><ActionBtn icon={Eye} label="View Event" /></Link>
            <ActionBtn icon={Pencil} label="Edit" onClick={() => setShowEdit(true)} />
            <ActionBtn
              icon={ChevronDown}
              label={expanded ? "Close" : "Manage"}
              onClick={() => setExpanded((v) => !v)}
              active={expanded}
              iconClass={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            />
            <div className="ml-auto flex items-center gap-2">
              {deleteState === "confirming" && (
                <button
                  onClick={() => setDeleteState("idle")}
                  className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition px-2 py-1"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleDelete}
                disabled={deleteState === "deleting"}
                className={`flex items-center gap-1.5 text-sm font-medium rounded-xl px-3 py-1.5 border transition duration-300 ${
                  deleteState === "confirming"
                    ? "bg-red-700 border-red-600 text-white"
                    : "border-gray-400/50 text-[var(--muted)] hover:border-red-600 hover:text-red-400"
                }`}
              >
                {deleteState === "deleting"
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Trash2 className="w-3.5 h-3.5" />
                }
                {deleteState === "confirming" ? "Confirm?" : "Delete"}
              </button>
            </div>
          </div>
        </div>

        {/* Manage drawer */}
        {expanded && (
          <div className="border-t border-[var(--brand-purple)]/25">

            {/* Tab bar */}
            <div className="flex overflow-x-auto scrollbar-hide border-b border-[var(--brand-purple)]/25 bg-white/2">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition duration-300 ${
                    tab === key
                      ? "border-purple-600 text-[var(--foreground)]"
                      : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-white/3"
                  }`}
                >
                  <Icon className="w-4 h-4" />{label}
                </button>
              ))}
            </div>

            <div className="p-4 lg:p-6">
              {tab === "overview"  && <OverviewPanel event={event} />}
              {tab === "revenue"   && <RevenuePanel event={event} />}
              {tab === "tickets"   && <TicketsPanel event={event} onTicketsChanged={handleTicketsChanged} />}
              {tab === "promos"    && <PromoPanel eventId={String(event.id)} />}
              {tab === "analytics" && <AnalyticsPanel event={event} />}
              {tab === "attendees" && <AttendeePanel event={event} />}
              {tab === "vendors"   && <VendorsPanel eventId={String(event.id)} />}
              {tab === "scan"      && <ScanPanel event={event} />}
            </div>
          </div>
        )}
      </div>

      {showEdit && (
        <EditEventModal
          event={event}
          onClose={() => setShowEdit(false)}
          onSaved={(u) => setEvent((p) => ({ ...p, ...u }))}
        />
      )}
    </>
  );
}

// ── Overview panel ────────────────────────────────────────────────────────────

function OverviewPanel({ event }: { event: ManagedEvent }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

      <section className="flex flex-col gap-3">
        <p className="text-[var(--muted)] font-bold text-xs uppercase tracking-widest">Ticket Types</p>
        <div className="flex flex-col gap-2">
          {event.tickets.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between bg-white/2 border border-gray-400/20 rounded-xl px-4 py-3 hover:border-[var(--brand-purple)]/40 transition duration-300"
            >
              <div>
                <p className="text-[var(--foreground)] font-semibold text-sm">{t.type}</p>
                <p className="text-[var(--muted)] text-xs mt-0.5">{t.capacity} spots</p>
              </div>
              <span className={`font-bold text-sm ${t.type === "RSVP" ? "text-purple-600" : "text-[var(--brand-green)]"}`}>
                {t.type === "RSVP" ? "Free" : t.price}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <p className="text-[var(--muted)] font-bold text-xs uppercase tracking-widest">Attendance</p>
        <div className="flex flex-col gap-2.5">
          <MetaRow label="Confirmed"      value={String(event.attendees)} />
          <MetaRow label="Total Capacity" value={String(event.stats.totalCapacity)} />
          <MetaRow
            label="Spots Remaining"
            value={event.stats.spotsRemaining === 0 ? "SOLD OUT" : String(event.stats.spotsRemaining)}
            valueColor={
              event.stats.spotsRemaining === 0  ? "text-red-400"
              : event.stats.spotsRemaining < 20 ? "text-orange-400"
              :                                   "text-[var(--foreground)]"
            }
          />
          <FillBar rate={event.stats.fillRate} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <p className="text-[var(--muted)] font-bold text-xs uppercase tracking-widest">Event Info</p>
        <div className="flex flex-col gap-2.5">
          <InfoRow icon={CalendarDays} color="text-purple-600"          text={`${event.date} · ${event.time}`} />
          <InfoRow icon={MapPin}       color="text-[var(--muted)]"      text={event.location} />
          {!event.stats.isRsvp && (
            <InfoRow icon={TrendingUp} color="text-[var(--brand-green)]" text={`KES ${event.stats.ticketRevenue.toLocaleString()} estimated revenue`} />
          )}
        </div>
        {event.description && (
          <div className="pt-3 border-t border-[var(--brand-purple)]/25 flex flex-col gap-2">
            <p className="text-[var(--muted)] font-bold text-xs uppercase tracking-widest">About</p>
            <p className="text-sm text-[var(--muted)] leading-relaxed">{event.description}</p>
          </div>
        )}
      </section>
    </div>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function Badge({ variant, children }: { variant: string; children: React.ReactNode }) {
  const styles: Record<string, string> = {
    purple: "bg-purple-900/70 text-purple-300 border-purple-700/60",
    blue:   "bg-blue-900/70   text-blue-300   border-blue-700/60",
    red:    "bg-red-900/70    text-red-300    border-red-700/60",
    orange: "bg-orange-900/70 text-orange-300 border-orange-700/60",
    gray:   "bg-gray-700/80   text-gray-400   border-gray-600/60",
  };
  return (
    <span className={`text-xs font-semibold border px-2.5 py-1 rounded-lg ${styles[variant] ?? styles.gray}`}>
      {children}
    </span>
  );
}

function StatCard({ icon: Icon, iconColor, label, value, valueColor = "text-[var(--foreground)]" }: {
  icon: React.ElementType; iconColor: string; label: string; value: string; valueColor?: string;
}) {
  return (
    <div className="bg-white/2 border border-gray-400/20 rounded-xl px-3 py-3">
      <Icon className={`w-4 h-4 ${iconColor} mb-2`} />
      <p className={`text-sm font-bold ${valueColor} leading-tight`}>{value}</p>
      <p className="text-xs text-[var(--muted)] mt-0.5">{label}</p>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick, active, iconClass, fullWidth }: {
  icon: React.ElementType; label: string; onClick?: () => void;
  active?: boolean; iconClass?: string; fullWidth?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 text-sm font-medium rounded-xl px-3 py-2.5 border transition duration-300 ${
        fullWidth ? "w-full" : ""
      } ${
        active
          ? "bg-purple-600 border-purple-600 text-white hover:bg-purple-700"
          : "border-gray-400/50 text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
      }`}
    >
      <Icon className={`w-3.5 h-3.5 ${iconClass ?? ""}`} />
      {label}
    </button>
  );
}

function MetaRow({ label, value, valueColor = "text-[var(--foreground)]" }: {
  label: string; value: string; valueColor?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[var(--muted)] text-sm">{label}</span>
      <span className={`font-semibold text-sm ${valueColor}`}>{value}</span>
    </div>
  );
}

function InfoRow({ icon: Icon, color, text }: {
  icon: React.ElementType; color: string; text: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${color}`} />
      <span className="text-sm text-[var(--muted)] leading-relaxed">{text}</span>
    </div>
  );
}