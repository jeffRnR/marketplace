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
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-gray-300 font-bold text-[1.5rem]">Upcoming Events</h2>
        <Link
          href="/events/all"
          className="text-gray-300 font-bold px-2 py-1 lg:text-md text-sm rounded-lg
                     hover:bg-gray-200 hover:cursor-pointer hover:text-gray-800 transition
                     duration-300 border border-gray-400 gap-2 flex items-center"
        >
          <span>See All</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm">Loading events...</span>
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center justify-center py-16 text-red-400 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && displayed.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500 gap-2">
          <MapPin className="w-8 h-8 opacity-40" />
          <p className="text-sm">No upcoming events yet.</p>
          <Link
            href="/events/create"
            className="mt-2 text-purple-400 hover:text-purple-300 text-sm font-medium transition"
          >
            Create the first one →
          </Link>
        </div>
      )}

      {!loading && !error && displayed.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 w-full gap-4">
          {displayed.map(event => (
            <Link key={event.id} href={`/events/${event.id}`}>
              <div className="shadow-md shadow-black p-2 rounded-2xl">
                <EventPreviewCard {...event} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}