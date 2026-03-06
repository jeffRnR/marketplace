"use client";

// /app/events/page.tsx
import { ArrowRight, MapPin, Search, Map, MapPinOff, LocateFixed, X, Loader2 } from "lucide-react";
import React, { useState, useEffect, useRef, useCallback } from "react";
import EventPreviewCard from "@/components/EventPreviewCard";
import CategoryPreviewCard from "@/components/CategoryPreviewCard";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Event, formatDbEvent } from "@/data/events";
import { categories as staticCategories, Category } from "@/data/categories";

const EventsMap = dynamic(() => import("@/components/EventsMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] bg-gray-800 rounded-lg flex items-center justify-center">
      <p className="text-gray-400 text-sm">Loading map...</p>
    </div>
  ),
});

type EventWithDistance = Event & { distance?: number };

type LocationState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "granted"; lat: number; lng: number }
  | { status: "denied"; reason: string };

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function EventsList() {
  const [locationSearch, setLocationSearch] = useState("");
  const [filteredEvents, setFilteredEvents] = useState<EventWithDistance[]>([]);
  const [allEvents, setAllEvents] = useState<EventWithDistance[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<EventWithDistance[]>([]);
  const [locationState, setLocationState] = useState<LocationState>({ status: "idle" });
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Category state ──
  const [categories, setCategories] = useState<Category[]>(staticCategories);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [categoryEvents, setCategoryEvents] = useState<EventWithDistance[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const categoryResultsRef = useRef<HTMLDivElement>(null);

  // Fetch all upcoming events on mount
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/events");
        if (!res.ok) throw new Error("Failed to fetch events");
        const raw = await res.json();
        const formatted: EventWithDistance[] = (Array.isArray(raw) ? raw : []).map(formatDbEvent);
        const now = new Date().setHours(0, 0, 0, 0);
        const upcoming = formatted.filter((e) => new Date(e.date).getTime() >= now);
        setUpcomingEvents(upcoming);
        setAllEvents(upcoming);
        setFilteredEvents(upcoming);
      } catch (err: any) {
        console.error("Failed to fetch events:", err);
        setError("Could not load events. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // Fetch live category counts from DB
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/categories");
        if (!res.ok) return; // fall back to static data silently
        const live: { id: number; name: string; eventsCount: number; icon?: string; iconColor?: string }[] = await res.json();

        // Merge live counts + icon data into the static array
        // (static array holds the React icon components the DB doesn't store)
        setCategories((prev) =>
          prev.map((cat) => {
            const match = live.find((l) => l.id === cat.id);
            return match ? { ...cat, eventsCount: match.eventsCount } : cat;
          })
        );
      } catch {
        // silently keep static data if fetch fails
      }
    })();
  }, []);
  useEffect(() => {
    if (upcomingEvents.length === 0) return;
    let updated: EventWithDistance[] = [...upcomingEvents];
    if (locationState.status === "granted") {
      updated = updated.map((event) =>
        event.lat && event.lng
          ? { ...event, distance: calculateDistance(locationState.lat, locationState.lng, event.lat, event.lng) }
          : event
      );
      updated.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    }
    setAllEvents(updated);
    setFilteredEvents(updated);
  }, [locationState, upcomingEvents]);

  // Filter by search query
  useEffect(() => {
    const query = locationSearch.toLowerCase().trim();
    if (!query) {
      setFilteredEvents(allEvents);
      setShowDropdown(false);
      return;
    }
    const results = allEvents.filter(
      (e) =>
        e.title.toLowerCase().includes(query) ||
        e.location.toLowerCase().includes(query)
    );
    setFilteredEvents(results);
    setShowDropdown(true);
  }, [locationSearch, allEvents]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Fetch events by category ──
  const handleCategoryClick = useCallback(async (categoryId: number) => {
    // Clicking the same category again deselects it
    if (selectedCategoryId === categoryId) {
      setSelectedCategoryId(null);
      setCategoryEvents([]);
      return;
    }

    setSelectedCategoryId(categoryId);
    setCategoryLoading(true);
    setCategoryEvents([]);

    try {
      const res = await fetch(`/api/events?categoryId=${categoryId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const raw = await res.json();
      const formatted: EventWithDistance[] = (Array.isArray(raw) ? raw : []).map(formatDbEvent);
      // Filter to upcoming only
      const now = new Date().setHours(0, 0, 0, 0);
      const upcoming = formatted.filter((e) => new Date(e.date).getTime() >= now);
      setCategoryEvents(upcoming);
    } catch {
      setCategoryEvents([]);
    } finally {
      setCategoryLoading(false);
      // Scroll to results
      setTimeout(() => {
        categoryResultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [selectedCategoryId]);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const displayedEvents = allEvents.slice(0, 4);
  const userCoords = locationState.status === "granted"
    ? { lat: locationState.lat, lng: locationState.lng }
    : null;

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationState({ status: "denied", reason: "Geolocation is not supported by your browser." });
      return;
    }
    setLocationState({ status: "requesting" });
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocationState({ status: "granted", lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        const reasons: Record<number, string> = {
          1: "Location permission was denied. You can enable it in your browser settings.",
          2: "Your location could not be determined.",
          3: "Location request timed out.",
        };
        setLocationState({ status: "denied", reason: reasons[err.code] ?? "An unknown error occurred." });
      },
      { timeout: 10000 }
    );
  }, []);

  const clearLocation = useCallback(() => setLocationState({ status: "idle" }), []);

  return (
    <div className="p-4 lg:w-[70%] mt-14 mx-auto w-full min-h-screen flex flex-col gap-4">

      {/* Header */}
      <div className="w-full">
        <h1 className="text-gray-300 font-bold text-[2.5rem]">Discover Events</h1>
        <p className="text-gray-400 text-md">
          Find upcoming events — search by name, location, or sort by proximity.
        </p>
      </div>

      {/* Upcoming Events */}
      <div className="flex-col justify-between my-8 w-full">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-gray-300 font-bold text-[1.5rem]">Upcoming Events</h1>
          <Link
            href="/events/all"
            className="text-gray-300 font-bold px-2 py-1 lg:text-md text-sm rounded-lg
            hover:bg-gray-200 hover:cursor-pointer hover:text-gray-800 transition duration-300 border
            border-gray-400 gap-2 flex items-center"
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
          <div className="flex items-center justify-center py-16 text-red-400 text-sm">{error}</div>
        )}
        {!loading && !error && displayedEvents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500 gap-2">
            <MapPin className="w-8 h-8 opacity-40" />
            <p className="text-sm">No upcoming events yet.</p>
            <Link href="/events/create" className="mt-2 text-purple-400 hover:text-purple-300 text-sm font-medium transition">
              Create the first one →
            </Link>
          </div>
        )}
        {!loading && !error && displayedEvents.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 w-full gap-4">
            {displayedEvents.map((event) => (
              <Link key={event.id} href={`/events/${event.id}`}>
                <div className="shadow-md shadow-black p-2 rounded-2xl">
                  <EventPreviewCard {...event} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Browse by Category ── */}
      <div className="mt-8 w-full">
        <h1 className="text-gray-300 font-bold text-[1.5rem] mb-4">Browse by Category</h1>
        <div className="flex gap-4 overflow-x-auto pb-4 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible">
          {categories.map((category) => (
            <CategoryPreviewCard
              key={category.id}
              name={category.name}
              eventsCount={category.eventsCount}
              icon={category.iconComponent}
              iconColor={category.iconColor}
              selected={selectedCategoryId === category.id}
              onClick={() => handleCategoryClick(category.id)}
            />
          ))}
        </div>
      </div>

      {/* ── Category results ── */}
      {selectedCategoryId !== null && (
        <div ref={categoryResultsRef} className="mt-6 w-full">

          {/* Category results header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {selectedCategory && (
                <span className="flex items-center justify-center w-8 h-8">
                  <selectedCategory.iconComponent
                    style={{ color: selectedCategory.iconColor, width: "1.5rem", height: "1.5rem" }}
                  />
                </span>
              )}
              <h2 className="text-gray-300 font-bold text-[1.5rem]">
                {selectedCategory?.name ?? "Category"}
              </h2>
            </div>
            <button
              onClick={() => { setSelectedCategoryId(null); setCategoryEvents([]); }}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 border border-gray-700 hover:border-gray-500 rounded-lg px-3 py-1.5 transition duration-300"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          </div>

          {/* Loading */}
          {categoryLoading && (
            <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">Loading {selectedCategory?.name} events...</span>
            </div>
          )}

          {/* Empty */}
          {!categoryLoading && categoryEvents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500 gap-2">
              <MapPin className="w-8 h-8 opacity-40" />
              <p className="text-sm">No upcoming events in this category.</p>
              <Link
                href="/events/create"
                className="mt-2 text-purple-400 hover:text-purple-300 text-sm font-medium transition"
              >
                Create one →
              </Link>
            </div>
          )}

          {/* Results grid */}
          {!categoryLoading && categoryEvents.length > 0 && (
            <>
              <p className="text-gray-500 text-sm mb-4">
                {categoryEvents.length} upcoming event{categoryEvents.length !== 1 ? "s" : ""}
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 w-full gap-4">
                {categoryEvents.map((event) => (
                  <Link key={event.id} href={`/events/${event.id}`}>
                    <div className="shadow-md shadow-black p-2 rounded-2xl">
                      <EventPreviewCard {...event} />
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Search + Location + Map Section */}
      <div className="mt-8 w-full" ref={dropdownRef}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-gray-300 font-bold text-[1.5rem]">Browse by Location</h1>
          <button
            onClick={() => setShowMap((v) => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition duration-300
              ${showMap
                ? "bg-purple-600 border-purple-500 text-white hover:bg-purple-700"
                : "border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200"
              }`}
          >
            {showMap ? <MapPinOff className="h-4 w-4" /> : <Map className="h-4 w-4" />}
            {showMap ? "Hide Map" : "Show Map"}
          </button>
        </div>

        {/* Search bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-20" />
          <input
            type="text"
            placeholder="Search events by name or location..."
            value={locationSearch}
            onChange={(e) => setLocationSearch(e.target.value)}
            className="w-full bg-gray-800 text-gray-300 rounded-lg pl-10 pr-4 py-3
              focus:ring-2 focus:ring-purple-500 outline-none border border-gray-700"
          />
          {showDropdown && filteredEvents.length > 0 && (
            <div className="absolute w-full mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
              {filteredEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  onClick={() => setShowDropdown(false)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition"
                >
                  <img src={event.image} alt={event.title} className="w-10 h-10 rounded-md object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-200 font-medium text-sm truncate">{event.title}</p>
                    <p className="text-gray-400 text-xs flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {event.location}
                    </p>
                  </div>
                  {event.distance !== undefined && (
                    <span className="text-purple-400 text-xs font-semibold shrink-0">
                      {event.distance.toFixed(1)} km
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {locationState.status === "idle" && (
          <div className="flex items-center gap-3 bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-3 mb-4">
            <LocateFixed className="h-5 w-5 text-purple-400 shrink-0" />
            <p className="text-gray-400 text-sm flex-1">Want to see events sorted by distance?</p>
            <button onClick={requestLocation} className="text-sm font-semibold text-purple-400 hover:text-purple-300 transition whitespace-nowrap">
              Use my location
            </button>
          </div>
        )}
        {locationState.status === "requesting" && (
          <div className="flex items-center gap-3 bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-3 mb-4">
            <div className="h-4 w-4 rounded-full border-2 border-purple-500 border-t-transparent animate-spin shrink-0" />
            <p className="text-gray-400 text-sm">Requesting your location…</p>
          </div>
        )}
        {locationState.status === "granted" && (
          <div className="flex items-center gap-3 bg-purple-900/30 border border-purple-700/50 rounded-lg px-4 py-3 mb-4">
            <LocateFixed className="h-4 w-4 text-purple-400 shrink-0" />
            <p className="text-purple-300 text-sm flex-1">Showing events sorted by distance from your location.</p>
            <button onClick={clearLocation} className="text-gray-500 hover:text-gray-300 transition">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {locationState.status === "denied" && (
          <div className="flex items-start gap-3 bg-red-900/20 border border-red-700/40 rounded-lg px-4 py-3 mb-4">
            <MapPin className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm flex-1">{locationState.reason}</p>
            <button onClick={clearLocation} className="text-gray-500 hover:text-gray-300 transition shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {showMap && (
          <div className="rounded-lg overflow-hidden border border-gray-700 z-10 mb-4">
            <EventsMap events={filteredEvents} userLocation={userCoords} />
          </div>
        )}

        {!loading && (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <MapPin className="h-4 w-4" />
            <span>
              {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""} found
              {locationSearch && ` matching "${locationSearch}"`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}