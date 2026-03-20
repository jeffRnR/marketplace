"use client";
// app/my-events/components/AttendeePanel.tsx
// Shows real attendees from confirmed orders.
// Fetches from /api/my-events/[eventId]/attendees.

import React, { useEffect, useState } from "react";
import {
  Search, Download, CheckCircle, Clock,
  UserCheck, Users, Loader2, Mail, Phone,
  Ticket, AlertCircle,
} from "lucide-react";
import { ManagedEvent } from "../types";
import { FillBar } from "./FillBar";

interface Attendee {
  orderId:     string;
  name:        string;
  email:       string;
  phone:       string;
  ticketType:  string;
  ticketCode:  string;
  quantity:    number;
  price:       string;
  isRsvp:      boolean;
  purchasedAt: string;
}

export function AttendeePanel({ event }: { event: ManagedEvent }) {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [search,    setSearch]    = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true); setError("");
      try {
        const res  = await fetch(`/api/my-events/${event.id}/attendees`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load attendees");
        setAttendees(data.attendees ?? []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [event.id]);

  const filtered = attendees.filter((a) =>
    [a.name, a.email, a.ticketType, a.ticketCode, a.phone].some((v) =>
      v.toLowerCase().includes(search.toLowerCase())
    )
  );

  const exportCSV = () => {
    const rows = [
      ["Name", "Email", "Phone", "Ticket Type", "Ticket Code", "Qty", "Price", "RSVP", "Purchased"],
      ...attendees.map((a) => [
        a.name, a.email, a.phone, a.ticketType, a.ticketCode,
        String(a.quantity), a.price, a.isRsvp ? "Yes" : "No",
        new Date(a.purchasedAt).toLocaleDateString("en-KE"),
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const el  = document.createElement("a");
    el.href     = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    el.download = `${event.title.replace(/[^a-z0-9]/gi, "-")}-attendees.csv`;
    el.click();
  };

  const total    = attendees.length;
  const rsvpCount  = attendees.filter(a => a.isRsvp).length;
  const paidCount  = attendees.filter(a => !a.isRsvp).length;
  const fillRate = event.stats.totalCapacity > 0
    ? Math.round((event.attendees / event.stats.totalCapacity) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-gray-300 font-bold text-2xl">
            {event.attendees}
            <span className="text-gray-500 text-base font-normal">
              {" "}/ {event.stats.totalCapacity} capacity
            </span>
          </p>
          <p className="text-gray-400 text-sm mt-0.5">
            {event.stats.spotsRemaining > 0
              ? `${event.stats.spotsRemaining} spots remaining`
              : "Sold out"}
          </p>
        </div>
        <button
          onClick={exportCSV}
          disabled={loading || attendees.length === 0}
          className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-gray-200 border border-gray-600 hover:border-gray-400 bg-gray-800 rounded-lg px-3 py-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Stats */}
      <FillBar rate={fillRate} />
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Users,     label: "Total",     value: total,     color: "text-gray-300" },
          { icon: Ticket,    label: "Paid",      value: paidCount, color: "text-green-400" },
          { icon: UserCheck, label: "RSVP",      value: rsvpCount, color: "text-purple-400" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-gray-700/40 border border-gray-700 rounded-lg py-3 px-3 text-center">
            <Icon className={`w-4 h-4 mx-auto mb-1.5 ${color}`} />
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, phone or ticket code…"
          className="w-full bg-gray-800 text-gray-300 rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none border border-gray-700 text-sm"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 bg-red-900/20 border border-red-700/30 rounded-xl px-4 py-3 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      ) : attendees.length === 0 ? (
        <div className="text-center py-12 bg-gray-800/40 border border-gray-700 rounded-xl">
          <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 font-semibold">No attendees yet</p>
          <p className="text-gray-600 text-sm mt-1">
            Confirmed ticket orders will appear here.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-gray-500 text-sm py-10">No attendees match your search.</p>
      ) : (
        <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
          {filtered.map((a, i) => (
            <div
              key={`${a.orderId}-${i}`}
              className="flex items-center gap-3 bg-gray-700/30 hover:bg-gray-700/60 border border-gray-700 hover:border-gray-600 rounded-lg px-4 py-3 transition duration-300"
            >
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-gray-600 border border-gray-500 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-gray-300">{a.name.charAt(0).toUpperCase()}</span>
              </div>

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-300 truncate">{a.name}</p>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <span className="text-xs text-gray-500 flex items-center gap-1 truncate">
                    <Mail className="w-3 h-3 shrink-0" />{a.email}
                  </span>
                  {a.phone && (
                    <span className="text-xs text-gray-600 flex items-center gap-1 hidden sm:flex">
                      <Phone className="w-3 h-3 shrink-0" />{a.phone}
                    </span>
                  )}
                </div>
              </div>

              {/* Ticket info */}
              <div className="hidden sm:flex flex-col items-end gap-1 shrink-0 text-right">
                <span className={`text-xs px-2 py-0.5 rounded-md font-semibold ${
                  a.isRsvp
                    ? "bg-purple-900/40 text-purple-400"
                    : "bg-green-900/40 text-green-400"
                }`}>
                  {a.ticketType}
                </span>
                <span className="text-gray-600 text-xs font-mono">
                  {a.ticketCode.slice(0, 8).toUpperCase()}
                </span>
                <span className="text-gray-600 text-xs">
                  {new Date(a.purchasedAt).toLocaleDateString("en-KE", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && attendees.length > 0 && (
        <p className="text-gray-600 text-xs text-center">
          Showing {filtered.length} of {attendees.length} attendee{attendees.length !== 1 ? "s" : ""}
          {search && ` matching "${search}"`}
        </p>
      )}
    </div>
  );
}