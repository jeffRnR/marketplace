"use client";
// app/my-events/components/EventRow.tsx

import React, { useState } from "react";
import Link from "next/link";
import {
  CalendarDays, MapPin, Clock, Users, TrendingUp, Package,
  Eye, BarChart2, Trash2, Loader2, Tag, Pencil, Zap,
  Activity, ChevronDown, Ticket,
} from "lucide-react";
import { ManagedEvent, DeleteState } from "../types";
import { FillBar } from "./FillBar";
import { AttendeePanel } from "./AttendeePanel";
import { RevenuePanel } from "./RevenuePanel";
import { PromoPanel } from "./PromoPanel";
import { AnalyticsPanel } from "./AnalyticsPanel";
import { EditEventModal } from "./EditEventModal";

type DetailTab = "overview" | "analytics" | "attendees" | "revenue" | "promos";

const TABS: { key: DetailTab; label: string; icon: React.ElementType }[] = [
  { key: "overview",  label: "Overview",  icon: BarChart2  },
  { key: "analytics", label: "Insights",  icon: Activity   },
  { key: "attendees", label: "Attendees", icon: Users      },
  { key: "revenue",   label: "Revenue",   icon: TrendingUp },
  { key: "promos",    label: "Promos",    icon: Tag        },
];

export function EventRow({
  event: initialEvent,
  onDelete,
}: {
  event: ManagedEvent;
  onDelete: (id: number) => void;
}) {
  const [event, setEvent] = useState(initialEvent);
  const [deleteState, setDeleteState] = useState<DeleteState>("idle");
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<DetailTab>("overview");
  const [showEdit, setShowEdit] = useState(false);
  const isPast = event.stats.isPast;

  const handleDelete = async () => {
    if (deleteState === "idle")       { setDeleteState("confirming"); return; }
    if (deleteState === "confirming") {
      setDeleteState("deleting");
      await onDelete(event.id);
      setDeleteState("idle");
    }
  };

  return (
    <>
      <div className={`shadow-md shadow-black rounded-2xl overflow-hidden border transition duration-300 ${
        isPast
          ? "bg-gray-800/40 border-gray-700/50 opacity-70"
          : "bg-gray-800 border-gray-700 hover:border-gray-600"
      }`}>

        {/* ── Hero image ── */}
        <div className="relative h-44 sm:h-56 overflow-hidden">
          <img
            src={event.image}
            alt={event.title}
            className="w-full h-full object-cover"
            style={{ filter: isPast ? "grayscale(30%) brightness(0.65)" : "brightness(0.72)" }}
          />
          {/* gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent" />

          {/* Top badges */}
          <div className="absolute top-3 right-3 flex items-center gap-2 flex-wrap justify-end">
            {event.stats.isRsvp
              ? <Badge variant="blue">Free RSVP</Badge>
              : <Badge variant="purple">Paid</Badge>}
            {event.stats.spotsRemaining === 0 && <Badge variant="red">Sold Out</Badge>}
            {event.stats.fillRate >= 90 && event.stats.spotsRemaining > 0 && <Badge variant="orange">Almost Full</Badge>}
            {isPast && <Badge variant="gray">Past</Badge>}
          </div>

          {/* Title overlay */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
            <h3 className="text-gray-300 font-bold text-[1.5rem] leading-tight drop-shadow">{event.title}</h3>
            <p className="text-gray-400 text-sm mt-0.5">
              Hosted by <span className="text-purple-400 font-medium">{event.host}</span>
            </p>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="p-4 flex flex-col gap-4">

          {/* Meta */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-gray-400">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-gray-500" />{event.date}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-500" />{event.time}
            </span>
            <span className="flex items-center gap-1.5 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span className="truncate">{event.location}</span>
            </span>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={Users}     iconColor="text-purple-400" label="Attending"
              value={String(event.attendees)} />
            <StatCard icon={Package}   iconColor="text-green-400"   label="Capacity"
              value={String(event.stats.totalCapacity)} />
            <StatCard icon={Ticket}    iconColor="text-orange-400"   label="Spots left"
              value={event.stats.spotsRemaining === 0 ? "Sold out" : String(event.stats.spotsRemaining)}
              valueColor={event.stats.spotsRemaining === 0 ? "text-red-400" : event.stats.spotsRemaining < 20 ? "text-orange-400" : "text-gray-300"} />
            {event.stats.isRsvp
              ? <StatCard icon={Zap}        iconColor="text-purple-400" label="Type"         value="Free RSVP" />
              : <StatCard icon={TrendingUp} iconColor="text-green-400"  label="Est. revenue" value={`KES ${event.stats.ticketRevenue.toLocaleString()}`} valueColor="text-green-400" />
            }
          </div>

          {/* Fill bar */}
          <FillBar rate={event.stats.fillRate}/>

          {/* Description */}
          {event.description && (
            <p className="text-sm text-gray-400 leading-relaxed line-clamp-2">{event.description}</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/events/${event.id}`}>
              <ActionBtn icon={Eye} label="View Event" />
            </Link>
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
                  className="text-sm text-gray-500 hover:text-gray-300 transition px-2 py-1"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleDelete}
                disabled={deleteState === "deleting"}
                className={`flex items-center gap-1.5 text-sm font-medium rounded-lg px-3 py-1.5 border transition duration-300 ${
                  deleteState === "confirming"
                    ? "bg-red-700 border-red-600 text-white"
                    : "border-gray-600 text-gray-400 hover:border-red-600 hover:text-red-400"
                }`}
              >
                {deleteState === "deleting"
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Trash2 className="w-3.5 h-3.5" />}
                {deleteState === "confirming" ? "Confirm?" : "Delete"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Manage drawer ── */}
        {expanded && (
          <div className="border-t border-gray-700">

            {/* Tab bar */}
            <div className="flex overflow-x-auto border-b border-gray-700 bg-gray-900/60">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition duration-300 ${
                    tab === key
                      ? "border-purple-500 text-purple-400"
                      : "border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/40"
                  }`}
                >
                  <Icon className="w-4 h-4" />{label}
                </button>
              ))}
            </div>

            {/* Panel content */}
            <div className="p-4 lg:p-6">
              {tab === "overview"  && <OverviewPanel event={event} />}
              {tab === "analytics" && <AnalyticsPanel event={event} />}
              {tab === "attendees" && <AttendeePanel event={event} />}
              {tab === "revenue"   && <RevenuePanel event={event} />}
              {tab === "promos"    && <PromoPanel eventId={event.id} />}
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

// ── Overview tab ────────────────────────────────────────────────────────

function OverviewPanel({ event }: { event: ManagedEvent }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

      {/* Tickets */}
      <section className="flex flex-col gap-3">
        <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">Ticket Types</p>
        <div className="flex flex-col gap-2">
          {event.tickets.map((t) => (
            <div key={t.id} className="flex items-center justify-between bg-gray-700/40 border border-gray-700 rounded-lg px-4 py-3 hover:border-gray-600 transition duration-300">
              <div>
                <p className="text-gray-300 font-semibold text-sm">{t.type}</p>
                <p className="text-gray-500 text-xs mt-0.5">{t.capacity} spots</p>
              </div>
              <span className={`font-bold text-sm ${t.type === "RSVP" ? "text-purple-400" : "text-green-400"}`}>
                {t.type === "RSVP" ? "FREE" : t.price}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Attendance */}
      <section className="flex flex-col gap-3">
        <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">Attendance</p>
        <div className="flex flex-col gap-2.5">
          <MetaRow label="Confirmed"      value={String(event.attendees)} />
          <MetaRow label="Total Capacity" value={String(event.stats.totalCapacity)} />
          <MetaRow
            label="Spots Remaining"
            value={event.stats.spotsRemaining === 0 ? "SOLD OUT" : String(event.stats.spotsRemaining)}
            valueColor={event.stats.spotsRemaining === 0 ? "text-red-400" : event.stats.spotsRemaining < 20 ? "text-orange-400" : "text-gray-300"}
          />
          {/* <MetaRow label="Fill Rate" value={`${event.stats.fillRate}%`} valueColor="text-purple-400" /> */}
          <FillBar rate={event.stats.fillRate}/>
        </div>
      </section>

      {/* Event info */}
      <section className="col-span-2 flex flex-col gap-3">
        <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">Event Info</p>
        <div className="flex flex-col gap-2.5">
          <InfoRow icon={CalendarDays} color="text-purple-400" text={`${event.date} · ${event.time}`} />
          <InfoRow icon={MapPin}       color="text-gray-400"   text={event.location} />
          {!event.stats.isRsvp && (
            <InfoRow icon={TrendingUp} color="text-green-400" text={`KES ${event.stats.ticketRevenue.toLocaleString()} estimated revenue`} />
          )}
        </div>
        {event.description && (
          <div className="pt-3 border-t border-gray-700 flex flex-col gap-2">
            <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">About</p>
            <p className="text-sm text-gray-400 leading-relaxed">{event.description}</p>
          </div>
        )}
      </section>
    </div>
  );
}

// ── Shared UI ────────────────────────────────────────────────────────────

function Badge({ variant, children }: { variant: string; children: React.ReactNode }) {
  const styles: Record<string, string> = {
    purple: "bg-purple-900/70 text-purple-300 border-purple-700/60",
    blue:   "bg-blue-900/70  text-blue-300   border-blue-700/60",
    red:    "bg-red-900/70   text-red-300    border-red-700/60",
    orange: "bg-orange-900/70 text-orange-300 border-orange-700/60",
    gray:   "bg-gray-700/80  text-gray-400   border-gray-600/60",
  };
  return (
    <span className={`text-xs font-semibold border px-2.5 py-1 rounded-lg ${styles[variant] ?? styles.gray}`}>
      {children}
    </span>
  );
}

function StatCard({
  icon: Icon, iconColor, label, value, valueColor = "text-gray-300",
}: {
  icon: React.ElementType; iconColor: string; label: string; value: string; valueColor?: string;
}) {
  return (
    <div className="bg-gray-700/40 border border-gray-700 rounded-lg px-3 py-3">
      <Icon className={`w-4 h-4 ${iconColor} mb-2`} />
      <p className={`text-sm font-bold ${valueColor} leading-tight`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function ActionBtn({
  icon: Icon, label, onClick, active, iconClass,
}: {
  icon: React.ElementType; label: string; onClick?: () => void; active?: boolean; iconClass?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 text-sm font-medium rounded-lg px-3 py-1.5 border transition duration-300 ${
        active
          ? "bg-purple-600 border-purple-500 text-white hover:bg-purple-700"
          : "border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200"
      }`}
    >
      <Icon className={`w-3.5 h-3.5 ${iconClass ?? ""}`} />
      {label}
    </button>
  );
}

function MetaRow({ label, value, valueColor = "text-gray-300" }: {
  label: string; value: string; valueColor?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-500 text-sm">{label}</span>
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
      <span className="text-sm text-gray-400 leading-relaxed">{text}</span>
    </div>
  );
}