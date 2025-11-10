"use client";

import { ArrowRight, MapPin, Search } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import EventPreviewCard from "@/components/EventPreviewCard";
import CategoryPreviewCard from "@/components/CategoryPreviewCard";
import Link from "next/link";
import dynamic from "next/dynamic";
import { events, Event } from "@/data/events";
import { categories } from "@/data/categories";

// Dynamic import to avoid SSR map errors
const EventsMap = dynamic(() => import("@/components/EventsMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] bg-gray-800 rounded-lg flex items-center justify-center">
      <p className="text-gray-400">Loading map...</p>
    </div>
  ),
});

type EventWithDistance = Event & { distance?: number };

function EventsList() {
  const [locationSearch, setLocationSearch] = useState("");
  const [filteredEvents, setFilteredEvents] = useState<EventWithDistance[]>([]);
  const [allEvents, setAllEvents] = useState<EventWithDistance[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Only upcoming events
  const upcomingEvents = events.filter(
    (e) => new Date(e.date).getTime() >= new Date().setHours(0, 0, 0, 0)
  );

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => console.log("Location access denied")
      );
    }
  }, []);

  // Calculate distance using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Compute distances for upcoming events
  useEffect(() => {
    let updated = upcomingEvents;

    if (userLocation) {
      updated = updated.map((event) =>
        event.lat && event.lng
          ? {
              ...event,
              distance: calculateDistance(userLocation.lat, userLocation.lng, event.lat, event.lng),
            }
          : event
      );
      updated.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    }

    setAllEvents(updated);
    setFilteredEvents(updated);
  }, [userLocation]);

  // Handle search input
  useEffect(() => {
    const query = locationSearch.toLowerCase();
    if (!query.trim()) {
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
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayedEvents = allEvents.slice(0, 4);

  return (
    <div className="p-4 lg:w-[70%] mx-auto w-full min-h-screen flex flex-col items-center mt-14 gap-4">
      {/* Header */}
      <div className="gap-4">
        <h1 className="text-gray-300 font-bold text-[2.5rem]">Discover Events</h1>
        <p className="text-gray-300 font-bold text-md">
          Find upcoming events near you — sorted by distance and location.
        </p>
      </div>

      {/* Upcoming Events */}
      <div className="flex-col my-8 w-full">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 w-full gap-4">
          {displayedEvents.map((event) => (
            <Link key={event.id} href={`/events/${event.id}`}>
              <EventPreviewCard {...event} />
            </Link>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="mt-14 w-full">
        <h1 className="text-gray-300 font-bold text-[1.5rem] mb-4">Browse by Category</h1>
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible">
          {categories.map((category, idx) => (
            <CategoryPreviewCard
              key={idx}
              name={category.name}
              eventsCount={category.eventsCount}
              icon={category.icon}
              iconColor={category.iconColor}
            />
          ))}
        </div>
      </div>

      {/* Search + Map */}
      <div className="mt-14 relative w-full" ref={dropdownRef}>
        <h1 className="text-gray-300 font-bold text-[1.5rem] mb-4">Browse by Location</h1>

        {/* Search Input */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 z-20" />
          <input
            type="text"
            placeholder="Search events by name or location..."
            value={locationSearch}
            onChange={(e) => setLocationSearch(e.target.value)}
            className="w-full bg-gray-800 text-gray-300 rounded-lg pl-10 pr-4 py-3
              focus:ring-2 focus:ring-purple-500 outline-none border border-gray-700 relative z-20"
          />

          {/* Dropdown */}
          {showDropdown && filteredEvents.length > 0 && (
            <div className="absolute w-full mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
              {filteredEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  onClick={() => setShowDropdown(false)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition"
                >
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-10 h-10 rounded-md object-cover"
                  />
                  <div className="flex-1">
                    <p className="text-gray-200 font-medium text-sm truncate">{event.title}</p>
                    <p className="text-gray-400 text-xs flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {event.location}
                    </p>
                  </div>
                  {event.distance !== undefined && (
                    <span className="text-purple-400 text-xs font-semibold">
                      {event.distance.toFixed(1)} km
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Map */}
        <div className="rounded-lg overflow-hidden border border-gray-700 z-10">
          <EventsMap events={filteredEvents} userLocation={userLocation} />
        </div>

        {/* Count */}
        <div className="mt-4 flex items-center gap-2 text-gray-400">
          <MapPin className="h-4 w-4" />
          <span>
            {filteredEvents.length} event
            {filteredEvents.length !== 1 ? "s" : ""} found
            {locationSearch && ` matching “${locationSearch}”`}
          </span>
        </div>
      </div>
    </div>
  );
}

export default EventsList;
