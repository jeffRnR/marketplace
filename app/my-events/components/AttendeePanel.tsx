"use client";
// app/my-events/components/AttendeePanel.tsx

import React, { useEffect, useState } from "react";
import {
  Search, Download, Loader2, Mail, Phone,
  Ticket, AlertCircle, Eye, EyeOff,
  UserCheck, Users,
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
  const [attendees,     setAttendees]     = useState<Attendee[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [search,        setSearch]        = useState("");
  const [showAttendees, setShowAttendees] = useState<boolean>(event.showAttendees ?? false);
  const [togglingVis,   setTogglingVis]   = useState(false);

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

  const toggleVisibility = async () => {
    setTogglingVis(true);
    const next = !showAttendees;
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ showAttendees: next }),
      });
      if (!res.ok) throw new Error("Failed to update visibility");
      setShowAttendees(next);
    } catch {
      setShowAttendees(!next);
    } finally {
      setTogglingVis(false);
    }
  };

  const total     = attendees.length;
  const rsvpCount = attendees.filter(a => a.isRsvp).length;
  const paidCount = attendees.filter(a => !a.isRsvp).length;
  const fillRate  = event.stats.totalCapacity > 0
    ? Math.round((event.attendees / event.stats.totalCapacity) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-[var(--foreground)] font-bold text-2xl">
            {event.attendees}
            <span className="text-[var(--muted)] text-base font-normal">
              {" "}/ {event.stats.totalCapacity} capacity
            </span>
          </p>
          <p className="text-[var(--muted)] text-sm mt-0.5">
            {event.stats.spotsRemaining > 0
              ? `${event.stats.spotsRemaining} spots remaining`
              : "Sold out"}
          </p>
        </div>
        <button
          onClick={exportCSV}
          disabled={loading || attendees.length === 0}
          className="flex items-center gap-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] border border-gray-400/50 hover:border-[var(--foreground)] bg-white/5 rounded-xl px-3 py-1.5 transition duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Fill bar */}
      <FillBar rate={fillRate} />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Users,     label: "Total",  value: total,     color: "text-[var(--foreground)]" },
          { icon: Ticket,    label: "Paid",   value: paidCount, color: "text-[var(--brand-green)]" },
          { icon: UserCheck, label: "RSVP",   value: rsvpCount, color: "text-purple-600" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-gray-900 border border-gray-400/20 rounded-xl py-3 px-3 text-center">
            <Icon className={`w-4 h-4 mx-auto mb-1.5 ${color}`} />
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Attendee count visibility toggle */}
      <div className="flex items-center justify-between bg-white/2 border border-gray-400/20 rounded-xl px-4 py-3">
        <div className="flex items-center gap-3">
          {showAttendees
            ? <Eye    className="w-4 h-4 text-purple-600 shrink-0" />
            : <EyeOff className="w-4 h-4 text-[var(--muted)] shrink-0" />
          }
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">
              Attendee count is {showAttendees ? "public" : "hidden"}
            </p>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {showAttendees
                ? "Visitors can see how many people are going"
                : "Only you can see the attendee count"}
            </p>
          </div>
        </div>
        <button
          onClick={toggleVisibility}
          disabled={togglingVis}
          className={`relative w-12 h-6 rounded-full transition-colors flex items-center px-0.5 shrink-0 disabled:opacity-60 disabled:cursor-not-allowed ${
            showAttendees ? "bg-purple-600" : "bg-gray-700"
          }`}
        >
          {togglingVis
            ? <Loader2 className="w-4 h-4 animate-spin text-white mx-auto" />
            : <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                showAttendees ? "translate-x-6" : "translate-x-0"
              }`} />
          }
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted)]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, phone or ticket code…"
          className="w-full bg-white/5 border border-gray-400/50 text-[var(--foreground)] rounded-xl pl-10 pr-4 py-3 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/30 text-sm placeholder:text-[var(--muted)] transition"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 bg-red-900/20 border border-red-800/50 rounded-xl px-4 py-3 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      ) : attendees.length === 0 ? (
        <div className="text-center py-12 bg-gray-900 border border-gray-400/20 rounded-2xl">
          <Users className="w-10 h-10 text-[var(--muted)] opacity-30 mx-auto mb-3" />
          <p className="text-[var(--foreground)] font-semibold">No attendees yet</p>
          <p className="text-[var(--muted)] text-sm mt-1">Confirmed ticket orders will appear here.</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-[var(--muted)] text-sm py-10">
          No attendees match your search.
        </p>
      ) : (
        <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
          {filtered.map((a, i) => (
            <div
              key={`${a.orderId}-${i}`}
              className="flex items-center gap-3 bg-white/2 hover:bg-white/5 border border-gray-400/20 hover:border-[var(--brand-purple)]/40 rounded-xl px-4 py-3 transition duration-300"
            >
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-white/5 border border-gray-400/20 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-[var(--foreground)]">
                  {a.name.charAt(0).toUpperCase()}
                </span>
              </div>

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--foreground)] truncate">{a.name}</p>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <span className="text-xs text-[var(--muted)] flex items-center gap-1 truncate">
                    <Mail className="w-3 h-3 shrink-0" />{a.email}
                  </span>
                  {a.phone && (
                    <span className="text-xs text-[var(--muted)] flex items-center gap-1 hidden sm:flex">
                      <Phone className="w-3 h-3 shrink-0" />{a.phone}
                    </span>
                  )}
                </div>
              </div>

              {/* Ticket info */}
              <div className="hidden sm:flex flex-col items-end gap-1 shrink-0 text-right">
                <span className={`text-xs px-2 py-0.5 rounded-lg border font-semibold ${
                  a.isRsvp
                    ? "bg-purple-600/20 border-purple-600/40 text-purple-400"
                    : "bg-green-900/20 border-green-700/30 text-green-400"
                }`}>
                  {a.ticketType}
                </span>
                <span className="text-[var(--muted)] text-xs font-mono opacity-60">
                  {a.ticketCode.slice(0, 8).toUpperCase()}
                </span>
                <span className="text-[var(--muted)] text-xs opacity-60">
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
        <p className="text-[var(--muted)] text-xs text-center opacity-60">
          Showing {filtered.length} of {attendees.length} attendee{attendees.length !== 1 ? "s" : ""}
          {search && ` matching "${search}"`}
        </p>
      )}
    </div>
  );
}