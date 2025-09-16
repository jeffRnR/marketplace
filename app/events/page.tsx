"use client";

import { ArrowRight } from "lucide-react";
import React from "react";
import EventPreviewCard from "@/components/EventPreviewCard";
import CategoryPreviewCard from "@/components/CategoryPreviewCard";
import Link from "next/link";
import { events } from "@/data/events";
import { categories } from "@/data/categories";

function EventsList() {
  // ✅ Sort events by date ascending (earliest → latest)
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // ✅ Show only first 4 in "Popular Events"
  const displayedEvents = sortedEvents.slice(0, 4);

  return (
    <div className="p-4 lg:w-[70%] mx-auto w-full min-h-screen flex-col items-center mt-10 gap-4">
      <div className="gap-4">
        <h1 className="text-gray-300 font-bold text-[2.5rem]">Discover Events</h1>
        <p className="text-gray-300 font-bold text-md">
          Discover the hottest events near you. Explore by category and find
          events that match your vibe
        </p>
      </div>

      {/* Popular Events */}
      <div className="flex-col my-14">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-auto">
          {displayedEvents.map((event) => (
            <EventPreviewCard key={event.id} {...event} />
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
    </div>
  );
}

export default EventsList;
