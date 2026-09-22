"use client";
// app/events/page.tsx

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  Clock3,
  MapPin,
  Search,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { formatDbEvent, Event } from "@/data/events";
import { categories as staticCategories, Category } from "@/data/categories";
import SignInModal from "@/components/SignInModal";

import CreateEventCTA from "./_components/CreateEventCTA";
import CategoryBrowser from "./_components/CategoryBrowser";
import LocationBrowser from "./_components/LocationBrowser";
// app/layout.tsx
import { Bungee_Shade } from "next/font/google";
const bungeeShade = Bungee_Shade({
  subsets: ["latin"],
  weight: "400",
});

type EventWithDistance = Event & { distance?: number };

export default function EventsPage() {
  const { status } = useSession();

  const [events, setEvents] = useState<EventWithDistance[]>([]);
  const [categories, setCategories] = useState<Category[]>(staticCategories);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<"soonest" | "popular">("soonest");

  const isAuthenticated = status === "authenticated";
  const isLoading = status === "loading";
  const isEventOwner = isAuthenticated && events.length > 0;




  // Fetch events for the discovery surface.
  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true); setError(null);
        const eventsRes = await fetch("/api/events");
        const rawEvents = eventsRes.ok ? await eventsRes.json() : [];

        const formatted: EventWithDistance[] = (Array.isArray(rawEvents) ? rawEvents : []).map(formatDbEvent);
        const now = new Date().setHours(0, 0, 0, 0);
        setEvents(formatted.filter(e => new Date(e.date).getTime() >= now));
      } catch {
        setError("Could not load events. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const visibleEvents = events
    .filter(event => {
      const normalizedQuery = query.trim().toLowerCase();
      const matchesQuery = !normalizedQuery
        || event.title.toLowerCase().includes(normalizedQuery)
        || event.location.toLowerCase().includes(normalizedQuery)
        || event.host.toLowerCase().includes(normalizedQuery);
      const matchesCategory = !activeCategory
        || event.categories.some(category => category.name === activeCategory);
      return matchesQuery && matchesCategory;
    })
    .sort((a, b) => sortMode === "popular"
      ? b.attendees - a.attendees
      : new Date(a.date).getTime() - new Date(b.date).getTime());

  // Fetch live category counts
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/categories");
        if (!res.ok) return;
        const live: { id: string; name: string; eventsCount: number }[] = await res.json();



        console.log("DB categories:", live); // check IDs here
        setCategories(prev =>
          live.flatMap(l => {
            const staticMatch = prev.find(s => s.name === l.name); // match by name
            return staticMatch ? [{ ...staticMatch, id: l.id, eventsCount: l.eventsCount }] : [];
          })
        );
      } catch { /* keep static */ }
    })();
  }, []);

  return (
    <div className="page-reveal min-h-screen w-full bg-[var(--background)] px-4 pb-20 pt-4 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <section className="overflow-hidden">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-center lg:p-12">
            <div>
              <p
                className={`${bungeeShade.className} mb-4 inline-block text-[var(--brand-green)] text-xl uppercase tracking-[0.08em] transition-all duration-500 hover:scale-110 hover:-rotate-2 hover:tracking-[0.14em] drop-shadow-[0_0_14px_currentColor]`}
              >
                Noizy<span className="text-purple-500">Hub</span>
              </p>
              <h1 className="max-w-xl text-4xl font-semibold leading-[1.05] tracking-tight text-[var(--foreground)] sm:text-6xl">
                Find your next event.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-[var(--muted)] sm:text-lg">
                Discover memorable things to do, close to home and easy to plan.
              </p>
              {/* <div className="relative mt-8 max-w-xl">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6d7c75]" />
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Search events, places, or hosts"
                  className="h-14 w-full rounded-xl border border-[var(--brand-purple)]/25 bg-[var(--surface)] pl-12 pr-12 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--brand-green)] focus:ring-4 focus:ring-[var(--brand-green)]/10"
                />
                {query && (
                  <button onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6d7c75] transition hover:text-[#1d2d28]">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div> */}
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            {/* <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand-green)]">The calendar</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">Happening soon</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">Upcoming events worth making time for.</p>
            </div> */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                {/* Replace the existing <select> with this */}

                <div className="relative">
                  <select
                    value={sortMode}
                    onChange={event =>
                      setSortMode(event.target.value as "soonest" | "popular")
                    }
                    className="h-10 appearance-none rounded-lg border border-[var(--brand-purple)]/25 bg-[var(--surface)] pl-9 pr-10 text-sm font-medium text-[var(--foreground)] shadow-sm outline-none transition-all duration-200 hover:border-[var(--brand-purple)]/50 focus:border-[var(--brand-purple)] focus:ring-2 focus:ring-[var(--brand-purple)]/10"
                  >
                    <option value="soonest">Soonest first</option>
                    <option value="popular">Most popular</option>
                  </select>

                  <svg
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
              <Link
                href="/events/all"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 px-4 text-sm font-bold text-white transition duration-300"
              >
                See all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {loading && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map(item => <div key={item} className="h-80 animate-pulse rounded-xl border-[0.5px] border-[var(--brand-purple)]/20 bg-[var(--surface)] shadow-[0_10px_30px_rgba(68,45,112,0.08)]" />)}</div>}
          {!loading && error && <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-sm text-red-200">{error}</div>}
          {!loading && !error && visibleEvents.length === 0 && <div className="rounded-2xl border border-dashed border-[var(--brand-purple)]/45 bg-[var(--surface)] px-6 py-16 text-center"><p className="text-lg font-semibold text-[var(--foreground)]">No events match that search.</p><button onClick={() => { setQuery(""); setActiveCategory(null); }} className="mt-3 text-sm font-semibold text-purple-500 hover:text-[var(--foreground)]">Clear filters</button></div>}
          {!loading && !error && visibleEvents.length > 0 && <div className="event-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visibleEvents.slice(0, 6).map(event => <EventListCard key={event.id} event={event} />)}</div>}
        </section>

        <div className="border-t border-[var(--border)] pt-10"><CategoryBrowser categories={categories} /></div>
        <div className="border-t border-[var(--border)] pt-10"><LocationBrowser events={events} loading={loading} /></div>
        <CreateEventCTA
          isAuthenticated={isAuthenticated}
          isLoading={isLoading}
          isEventOwner={isEventOwner}
          onSignIn={() => setShowSignInModal(true)}
        />

        {showSignInModal && <SignInModal onClose={() => setShowSignInModal(false)} />}
      </div>
    </div>
  );
}

function EventListCard({ event }: { event: EventWithDistance }) {
  return (
    <Link href={`/events/${event.id}`} className="group flex h-full flex-col overflow-hidden rounded-xl border-[0.5px] border-[var(--brand-purple)]/35 bg-[var(--surface)] transition duration-300 hover:-translate-y-1 hover:border-[var(--brand-purple)]">
      <div className="relative aspect-[1/1] overflow-hidden bg-[#111a1d]">
        <img src={event.image} alt={event.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        {/* <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[var(--surface)] to-transparent" /> */}
        <span className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#26343a] transition group-hover:rotate-45"><ArrowUpRight className="h-4 w-4" /></span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 text-xl font-semibold leading-tight">{event.title}</h3>
        <div className="mt-4 space-y-2 text-sm text-[#848d92]">
          <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#238b68]" /> {event.date}</p>
          <p className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#238b68]" /> {event.time}</p>
          <p className="flex items-center gap-2 truncate"><MapPin className="h-4 w-4 shrink-0 text-[#b45747]" /> {event.location}</p>
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-[var(--brand-purple)]/15 pt-4 text-xs font-semibold text-[#848d92]">
          <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-[#238b68]" /> {event.attendees} attending</span>
          <span className="text-purple-500 hover:text-purple-700">View event</span>
        </div>
      </div>
    </Link>
  );
}