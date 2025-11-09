"use client";

import { ArrowRight, MapPin, Search } from "lucide-react";
import React, { useState, useEffect } from "react";
import EventPreviewCard from "@/components/EventPreviewCard";
import CategoryPreviewCard from "@/components/CategoryPreviewCard";
import Link from "next/link";
import { events } from "@/data/events";
import { categories } from "@/data/categories";
import dynamic from "next/dynamic";

// Dynamically import the map component to avoid SSR issues
const EventsMap = dynamic(() => import("@/components/EventsMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] bg-gray-800 rounded-lg flex items-center justify-center">
      <p className="text-gray-400">Loading map...</p>
    </div>
  ),
});

function EventsList() {
  const [locationSearch, setLocationSearch] = useState("");
  const [filteredEvents, setFilteredEvents] = useState(events);

  // ✅ Sort events by date ascending (earliest → latest)
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // ✅ Show only first 4 in "Popular Events"
  const displayedEvents = sortedEvents.slice(0, 4);

  // Filter events by location
  useEffect(() => {
    if (locationSearch.trim() === "") {
      setFilteredEvents(events);
    } else {
      const filtered = events.filter((event) =>
        event.location.toLowerCase().includes(locationSearch.toLowerCase())
      );
      setFilteredEvents(filtered);
    }
  }, [locationSearch]);

  return (
    <div className="p-4 lg:w-[70%] mx-auto w-full min-h-screen flex-col items-center mt-14 gap-4">
      <div className="gap-4">
        <h1 className="text-gray-300 font-bold text-[2.5rem]">
          Discover Events
        </h1>
        <p className="text-gray-300 font-bold text-md">
          Discover the hottest events near you. Explore by category and find
          events that match your vibe
        </p>
      </div>

      {/* Popular Events */}
      <div className="flex-col my-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-gray-300 font-bold text-[1.5rem]">
            Popular Events
          </h1>
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

        {/* Grid of events */}
        <div className="grid grid-cols-1 lg:grid-cols-2 w-auto">
          {displayedEvents.map((event) => (
            <Link key={event.id} href={`/events/${event.id}`}>
              <EventPreviewCard key={event.id} {...event} />
            </Link>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="mt-14">
        <h1 className="text-gray-300 font-bold text-[1.5rem] mb-4">
          Browse by category
        </h1>
        <div
          className="
            flex gap-4 overflow-x-auto scrollbar-hide pb-4
            lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible
          "
        >
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

      {/* Location Search & Map */}
      <div className="mt-14">
        <h1 className="text-gray-300 font-bold text-[1.5rem] mb-4">
          Browse by Location
        </h1>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search events by location..."
            value={locationSearch}
            onChange={(e) => setLocationSearch(e.target.value)}
            className="w-full bg-gray-800 text-gray-300 rounded-lg pl-10 pr-4 py-3
              focus:ring-2 focus:ring-purple-500 outline-none border border-gray-700"
          />
        </div>

        {/* Map Component */}
        <div className="rounded-lg overflow-hidden border border-gray-700">
          <EventsMap events={filteredEvents} />
        </div>

        {/* Events Count */}
        <div className="mt-4 flex items-center gap-2 text-gray-400">
          <MapPin className="h-4 w-4" />
          <span>
            {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""} found
            {locationSearch && ` in "${locationSearch}"`}
          </span>
        </div>

        {/* Filtered Events Grid (Optional) */}
        {locationSearch && (
          <div className="mt-6">
            <h2 className="text-gray-300 font-bold text-lg mb-4">
              Events in {locationSearch}
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredEvents.length > 0 ? (
                filteredEvents.map((event) => (
                  <Link key={event.id} href={`/events/${event.id}`}>
                    <EventPreviewCard {...event} />
                  </Link>
                ))
              ) : (
                <div className="col-span-2 text-center py-8 text-gray-400">
                  No events found in this location
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EventsList;