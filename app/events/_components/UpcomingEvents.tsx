"use client";
// app/events/_components/UpcomingEvents.tsx

import React from "react";
import Link from "next/link";
import { ArrowRight, MapPin, Loader2 } from "lucide-react";
import EventPreviewCard from "@/components/EventPreviewCard";
import { Event } from "@/data/events";

type EventWithDistance = Event & { distance?: number };

interface Props {
  events: EventWithDistance[];
  loading: boolean;
  error: string | null;
}

export default function UpcomingEvents({ events, loading, error }: Props) {
  const displayed = events.slice(0, 4);

  return (
    <div className="flex flex-col w-full">

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[var(--foreground)] font-bold text-2xl">Upcoming Events</h2>
        <Link
          href="/events/all"
          className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold transition duration-300"
        >
          See All <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 gap-3 text-[var(--muted)]">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-purple)]" />
          <span className="text-sm">Loading events...</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex items-center justify-center py-16">
          <div className="text-sm text-red-400 bg-red-900/20 border border-red-800/50 rounded-xl px-4 py-3">
            {error}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && displayed.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 bg-gray-900 border border-gray-400/20 rounded-2xl gap-3">
          <MapPin className="w-8 h-8 text-[var(--muted)] opacity-40" />
          <p className="text-[var(--muted)] text-sm">No upcoming events yet.</p>
          <Link
            href="/events/create"
            className="text-[var(--brand-purple)] hover:opacity-80 text-sm font-semibold transition"
          >
            Create the first one →
          </Link>
        </div>
      )}

      {/* Grid */}
      {!loading && !error && displayed.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 w-full gap-4">
          {displayed.map(event => (
            <Link key={event.id} href={`/events/${event.id}`}>
              <div className="rounded-2xl border border-gray-400/20 hover:border-[var(--brand-purple)]/40 transition duration-300 overflow-hidden">
                <EventPreviewCard {...event} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}