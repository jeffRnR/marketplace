"use client";
// app/events/_components/LocationBrowser.tsx

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Search, Map, MapPinOff, LocateFixed, MapPin, X } from "lucide-react";
import dynamic from "next/dynamic";
import { Event } from "@/data/events";

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

interface Props {
  events: EventWithDistance[];
  loading: boolean;
}

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

export default function LocationBrowser({ events, loading }: Props) {
  const [locationSearch, setLocationSearch] = useState("");
  const [locationState, setLocationState] = useState<LocationState>({ status: "idle" });
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [sortedEvents, setSortedEvents] = useState<EventWithDistance[]>(events);
  const [filteredEvents, setFilteredEvents] = useState<EventWithDistance[]>(events);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Re-sort when location granted or events change
  useEffect(() => {
    let updated = [...events];
    if (locationState.status === "granted") {
      updated = updated.map(event =>
        event.lat && event.lng
          ? { ...event, distance: calculateDistance(locationState.lat, locationState.lng, event.lat, event.lng) }
          : event
      );
      updated.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    }
    setSortedEvents(updated);
    setFilteredEvents(updated);
  }, [locationState, events]);

  // Search filter
  useEffect(() => {
    const query = locationSearch.toLowerCase().trim();
    if (!query) { setFilteredEvents(sortedEvents); setShowDropdown(false); return; }
    setFilteredEvents(
      sortedEvents.filter(e =>
        e.title.toLowerCase().includes(query) || e.location.toLowerCase().includes(query)
      )
    );
    setShowDropdown(true);
  }, [locationSearch, sortedEvents]);

  // Close dropdown on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setShowDropdown(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationState({ status: "denied", reason: "Geolocation is not supported by your browser." });
      return;
    }
    setLocationState({ status: "requesting" });
    navigator.geolocation.getCurrentPosition(
      pos => setLocationState({ status: "granted", lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => {
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

  const userCoords = locationState.status === "granted"
    ? { lat: locationState.lat, lng: locationState.lng }
    : null;

  return (
    <div className="w-full" ref={dropdownRef}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[var(--foreground)] font-bold text-[1.5rem]">Browse by Location</h2>
        {/* <button
          onClick={() => setShowMap(v => !v)}
          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-medium
                      border transition duration-300 ${showMap
              ? "bg-[#64c5a6] border-[#64c5a6] text-[#09251e] hover:bg-[#8ce0c1]"
              : "border-[0.5px] border-[var(--brand-purple)]/30 bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--brand-purple)] hover:text-[var(--foreground)]"
            }`}
        >
          {showMap ? <MapPinOff className="h-4 w-4" /> : <Map className="h-4 w-4" />}
          {showMap ? "Hide Map" : "Show Map"}
        </button> */}
      </div>

      {/* Search bar */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6d7c75] z-20" />
        <input
          type="text"
          placeholder="Search events by name or location..."
          value={locationSearch}
          onChange={e => setLocationSearch(e.target.value)}
          className="w-full bg-[var(--surface)] text-[var(--foreground)] rounded-xl pl-10 pr-4 py-3
                     focus:ring-2 focus:ring-[var(--brand-green)] outline-none border-[0.5px] border-[var(--brand-purple)]/25 placeholder:text-[var(--muted)] shadow-[0_8px_24px_rgba(68,45,112,0.06)]"
        />
        {showDropdown && filteredEvents.length > 0 && (
          <div className="absolute w-full mt-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto">
            {filteredEvents.map(event => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                onClick={() => setShowDropdown(false)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--background)] transition"
              >
                <img src={event.image} alt={event.title} className="w-10 h-10 rounded-md object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--foreground)] font-medium text-sm truncate">{event.title}</p>
                  <p className="text-[#6d7c75] text-xs flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" />{event.location}
                  </p>
                </div>
                {event.distance !== undefined && (
                  <span className="text-[#8ce0c1] text-xs font-semibold shrink-0">
                    {event.distance.toFixed(1)} km
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Location status banners */}
      {locationState.status === "idle" && (
        <div className="flex items-center gap-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-3 mb-4">
          <LocateFixed className="h-5 w-5 text-[#64c5a6] shrink-0" />
          <p className="text-[#6d7c75] text-sm flex-1">Want to see events near you?</p>
          <button
            onClick={requestLocation}
            className="text-sm font-semibold text-[#247653] hover:text-[#1d2d28]
                       transition whitespace-nowrap"
          >
            Use my location
          </button>
        </div>
      )}
      {locationState.status === "requesting" && (
        <div className="flex items-center gap-3 bg-white border border-[#d5dfd7]
                        rounded-lg px-4 py-3 mb-4">
          <div className="h-4 w-4 rounded-full border-[0.5px] border-[#64c5a6]
                          border-t-transparent animate-spin shrink-0" />
          <p className="text-[#6d7c75] text-sm">Requesting your location…</p>
        </div>
      )}
      {locationState.status === "granted" && (
        <div className="flex items-center gap-3 bg-[#64c5a6]/10 border border-[#64c5a6]/30
                        rounded-lg px-4 py-3 mb-4">
          <LocateFixed className="h-4 w-4 text-[#64c5a6] shrink-0" />
          <p className="text-[#b8f0dc] text-sm flex-1">
            Showing events sorted by distance from your location.
          </p>
          <button
            onClick={() => setLocationState({ status: "idle" })}
            className="text-gray-500 hover:text-gray-300 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {locationState.status === "denied" && (
        <div className="flex items-start gap-3 bg-red-900/20 border border-red-700/40
                        rounded-lg px-4 py-3 mb-4">
          <MapPin className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm flex-1">{locationState.reason}</p>
          <button
            onClick={() => setLocationState({ status: "idle" })}
            className="text-gray-500 hover:text-gray-300 transition shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {showMap && (
        <div className="rounded-lg overflow-hidden border border-[var(--border)] z-10 mb-4">
          <EventsMap events={filteredEvents} userLocation={userCoords} />
        </div>
      )}

      {!loading && (
        <div className="flex items-center gap-2 text-[var(--muted)] text-sm">
          <MapPin className="h-4 w-4" />
          <span>
            {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""} found
            {locationSearch && ` matching "${locationSearch}"`}
          </span>
        </div>
      )}
    </div>
  );
}