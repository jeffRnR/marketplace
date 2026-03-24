"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { formatDbEvent, Event } from "@/data/events";
import EventPreviewCard from "@/components/EventPreviewCard";

function groupEventsByDate(events: Event[]) {
  return events.reduce((groups: Record<string, Event[]>, event: Event) => {
    const date = new Date(event.date).toLocaleDateString("en-US", {
      day: "numeric", month: "short", year: "numeric", weekday: "long",
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(event);
    return groups;
  }, {});
}

export default function AllEventsPage() {
  const { data: session } = useSession();
  const [events, setEvents] = useState<Event[]>([]);
  const [filter, setFilter] = useState<"upcoming" | "past">("upcoming");
  const [myId,   setMyId]   = useState<string | null>(null);

  // Get current user ID from session
  useEffect(() => {
    if (!session?.user?.email) return;
    fetch("/api/auth/session")
      .then(r => r.json())
      .then(s => setMyId((s as any)?.user?.id ?? null))
      .catch(() => {});
  }, [session]);

  useEffect(() => {
    async function fetchEvents() {
      const res  = await fetch("/api/events");
      const data = await res.json();
      setEvents(data.map(formatDbEvent));
    }
    fetchEvents();
  }, []);

  const now            = new Date();
  const filteredEvents = events.filter(e =>
    filter === "upcoming" ? new Date(e.date) >= now : new Date(e.date) < now
  );
  const groupedEvents  = groupEventsByDate(filteredEvents);

  return (
    <div className="p-4 lg:w-[75%] mx-auto w-full min-h-screen mt-14 mb-10">
      {/* Header row */}
      <div className="flex flex-row justify-between items-center mb-6 overflow-y-auto scrollbar-hide">
        <h1 className="text-gray-300 font-bold text-[2rem]">All Events</h1>
        <div className="flex bg-gray-800/50 rounded-full">
          {(["upcoming","past"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1 rounded-full text-sm font-medium transition-all duration-300 capitalize ${
                filter === f
                  ? "bg-purple-500/50 text-gray-300"
                  : "text-gray-400 hover:text-gray-200 hover:cursor-pointer"
              }`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        {/* Mobile Layout */}
        <div className="lg:hidden">
          <div className="absolute top-1.5 left-1.5 w-[2px] h-full bg-gradient-to-b from-gray-600/80 to-gray-600/20" />
          <div className="flex flex-col gap-4">
            {Object.keys(groupedEvents).length === 0 ? (
              <p className="text-gray-400 text-center">No {filter} events</p>
            ) : Object.keys(groupedEvents).map((date, idx) => (
              <div key={idx} className="relative flex flex-col gap-2">
                <div className="w-fit flex items-center gap-3 sticky top-20 left-1.5 z-40 backdrop-blur-lg bg-transparent rounded-2xl pr-1.5">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <h2 className="text-gray-300 font-semibold">{date}</h2>
                </div>
                <div className="flex-1 grid grid-cols-1 gap-4 ml-8">
                  {groupedEvents[date].map((event: Event) => (
                    <Link key={event.id} href={`/events/${event.id}`}>
                      <div className="bg-gray-800/50 rounded-2xl hover:shadow-lg hover:shadow-purple-500/20 transition">
                        <EventPreviewCard
                          {...event}
                          variant="allEvents"
                          isOwner={!!myId && event.createdById === myId}
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:block">
          <div
            className="absolute top-5.5 left-[202px] w-[2px] bg-gradient-to-b from-gray-600/80 via-gray-600/40 to-gray-600/3"
            style={{ height: "calc(100% - 2rem)" }}
          />
          <div className="space-y-0">
            {Object.keys(groupedEvents).length === 0 ? (
              <p className="text-gray-400 text-center">No {filter} events</p>
            ) : Object.keys(groupedEvents).map((date, idx) => (
              <div key={idx} className="relative">
                <div className="flex">
                  <div className="w-auto min-w-[198px] relative">
                    <div className="sticky top-20 z-20 backdrop-blur-sm py-2">
                      <div className="text-right pr-4">
                        <h2 className="text-gray-400 font-semibold text-sm p-2 rounded-lg inline-block">{date}</h2>
                      </div>
                    </div>
                  </div>
                  <div className="absolute left-[199px] top-5.5 z-10">
                    <div className="w-2 h-2 rounded-full bg-purple-500 shadow-lg shadow-purple-500/30 sticky top-[88px]" />
                  </div>
                  <div className="flex-1 ml-5 pb-16">
                    <div className="grid grid-cols-2 gap-6 pt-2">
                      {groupedEvents[date].map((event: Event) => (
                        <Link key={event.id} href={`/events/${event.id}`}>
                          <div className="bg-gray-800/50 rounded-2xl hover:shadow-md hover:shadow-purple-500/20 hover:border-purple-500/30 transition-all duration-300">
                            <EventPreviewCard
                              {...event}
                              variant="allEvents"
                              isOwner={!!myId && event.createdById === myId}
                            />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}