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
  const [myId, setMyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.email) return;
    fetch("/api/auth/session")
      .then(r => r.json())
      .then(s => setMyId((s as any)?.user?.id ?? null))
      .catch(() => {});
  }, [session]);

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      const res = await fetch("/api/events");
      const data = await res.json();
      setEvents(data.map(formatDbEvent));
      setLoading(false);
    }
    fetchEvents();
  }, []);

  const now = new Date();
  const filteredEvents = events.filter(e =>
    filter === "upcoming" ? new Date(e.date) >= now : new Date(e.date) < now
  );
  const groupedEvents = groupEventsByDate(filteredEvents);

  return (
    <div className="page-reveal min-h-screen w-full bg-[var(--background)] px-4 pb-20 pt-4 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">

        {/* Header */}
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand-green)]">
              Noizy events
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">
              All Events
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {filter === "upcoming" ? "Everything coming up." : "A look back."}
            </p>
          </div>

          {/* Toggle */}
          <div className="flex items-center gap-1 self-start rounded-xl border border-[var(--brand-purple)]/25 bg-[var(--surface)] p-1 sm:self-auto">
            {(["upcoming", "past"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition duration-200 ${
                  filter === f
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div
                key={i}
                className="h-80 animate-pulse rounded-xl border-[0.5px] border-[var(--brand-purple)]/20 bg-[var(--surface)] shadow-[0_10px_30px_rgba(68,45,112,0.08)]"
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && Object.keys(groupedEvents).length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--brand-purple)]/45 bg-[var(--surface)] px-6 py-20 text-center">
            <p className="text-lg font-semibold text-[var(--foreground)]">
              No {filter} events.
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {filter === "upcoming"
                ? "Check back soon — more events are on the way."
                : "Nothing in the archive yet."}
            </p>
          </div>
        )}

        {/* Timeline */}
        {!loading && Object.keys(groupedEvents).length > 0 && (
          <div className="relative flex flex-col gap-12">
            {/* Mobile timeline rail */}
            <div className="absolute left-2 top-2 h-full w-px bg-gradient-to-b from-[var(--brand-purple)]/40 to-transparent lg:hidden" />

            {/* Desktop timeline rail */}
            <div className="absolute left-[180px] top-2 hidden h-full w-px bg-gradient-to-b from-[var(--brand-purple)]/40 to-transparent lg:block" />

            {Object.keys(groupedEvents).map((date, idx) => (
              <div key={idx} className="relative">

                {/* Mobile layout */}
                <div className="lg:hidden">
                  <div className="sticky top-20 z-40 mb-4 flex items-center gap-3 backdrop-blur-md">
                    <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--brand-purple)] shadow-[0_0_8px_rgba(124,86,193,0.5)]" />
                    <p className="text-sm font-semibold text-[var(--foreground)]">{date}</p>
                  </div>
                  <div className="ml-6 grid grid-cols-1 gap-4">
                    {groupedEvents[date].map((event: Event) => (
                      <Link
                        key={event.id}
                        href={`/events/${event.id}`}
                        className="group overflow-hidden rounded-xl border-[0.5px] border-[var(--brand-purple)]/35 bg-[var(--surface)] transition duration-300 hover:-translate-y-1 hover:border-[var(--brand-purple)]"
                      >
                        <EventPreviewCard
                          {...event}
                          variant="allEvents"
                          isOwner={!!myId && event.createdById === myId}
                        />
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Desktop layout */}
                <div className="hidden lg:flex lg:gap-8">
                  {/* Date label */}
                  <div className="w-[180px] shrink-0">
                    <div className="sticky top-20 pb-2 text-right">
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        {date.split(",")[0]}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {date.split(",").slice(1).join(",").trim()}
                      </p>
                    </div>
                  </div>

                  {/* Dot */}
                  <div className="relative flex shrink-0 flex-col items-center">
                    <div className="sticky top-[84px] h-2.5 w-2.5 rounded-full bg-[var(--brand-purple)] shadow-[0_0_8px_rgba(124,86,193,0.5)]" />
                  </div>

                  {/* Cards */}
                  <div className="flex-1 pb-4">
                    <div className="grid gap-5 sm:grid-cols-2">
                      {groupedEvents[date].map((event: Event) => (
                        <Link
                          key={event.id}
                          href={`/events/${event.id}`}
                          className="group overflow-hidden rounded-xl border-[0.5px] border-[var(--brand-purple)]/35 bg-[var(--surface)] transition duration-300 hover:-translate-y-1 hover:border-[var(--brand-purple)]"
                        >
                          <EventPreviewCard
                            {...event}
                            variant="allEvents"
                            isOwner={!!myId && event.createdById === myId}
                          />
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}