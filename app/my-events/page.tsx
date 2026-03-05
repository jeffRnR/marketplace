"use client";
// app/my-events/page.tsx

import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Ticket, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { ManagedEvent, Summary, Tab } from "./types";
import { SummaryCards } from "./components/SummaryCards";
import { EventRow } from "./components/EventRow";

export default function MyEventsPage() {
  const { status } = useSession();
  const router = useRouter();

  const [events, setEvents] = useState<ManagedEvent[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("all");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/my-events");
      if (!res.ok) throw new Error("Failed to fetch events");
      const data = await res.json();
      setEvents(data.events ?? []);
      setSummary(data.summary ?? null);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchEvents();
  }, [status, fetchEvents]);

  const handleDelete = async (eventId: number) => {
    const res = await fetch(`/api/my-events?eventId=${eventId}`, { method: "DELETE" });
    if (!res.ok) return;
    setEvents((p) => p.filter((e) => e.id !== eventId));
    setSummary((p) => p ? { ...p, totalEvents: p.totalEvents - 1 } : p);
  };

  const filtered = events.filter((e) => {
    if (tab === "upcoming") return e.stats.isUpcoming;
    if (tab === "past") return e.stats.isPast;
    return true;
  });

  if (status === "loading" || (loading && events.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:w-[70%] mt-14 mx-auto w-full min-h-screen flex flex-col gap-4">

      {/* Header */}
      <div className="w-full">
        <h1 className="text-gray-300 font-bold text-[2.5rem]">My Events</h1>
        <p className="text-gray-400 text-md">Manage every event you've created — track attendance, revenue and more.</p>
      </div>

      {/* Summary stats */}
      {summary && (
        <div className="my-8 w-full">
          <SummaryCards summary={summary} />
        </div>
      )}

      {/* Tabs + Create button */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-lg p-1">
          {(["all", "upcoming", "past"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition duration-300 ${
                tab === t
                  ? "bg-purple-600 border border-purple-500 text-white"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {t}
              {t === "upcoming" && summary && summary.upcomingCount > 0 && (
                <span className="ml-1.5 text-xs text-purple-400">{summary.upcomingCount}</span>
              )}
            </button>
          ))}
        </div>

        <Link
          href="/events/create"
          className="text-gray-300 font-bold px-3 py-1.5 text-sm rounded-lg
            hover:bg-gray-200 hover:cursor-pointer hover:text-gray-800 transition duration-300 border
            border-gray-400 gap-2 flex items-center"
        >
          <Plus className="h-4 w-4" />
          <span>New Event</span>
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2.5 bg-red-900/20 border border-red-700/40 rounded-lg px-4 py-3 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm">Loading your events...</span>
        </div>
      ) : filtered.length === 0 ? (
        <Empty tab={tab} />
      ) : (
        <div className="flex flex-col gap-4 mt-4">
          {filtered.map((event) => (
            <EventRow key={event.id} event={event} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function Empty({ tab }: { tab: Tab }) {
  const msgs: Record<Tab, string> = {
    all:      "You haven't created any events yet.",
    upcoming: "No upcoming events.",
    past:     "No past events.",
  };
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-500 gap-3">
      <Ticket className="w-8 h-8 opacity-40" />
      <p className="text-sm">{msgs[tab]}</p>
      {tab === "all" && (
        <Link
          href="/events/create"
          className="mt-1 text-purple-400 hover:text-purple-300 text-sm font-medium transition"
        >
          Create your first event →
        </Link>
      )}
    </div>
  );
}