"use client";
// app/events/_components/CategoryBrowser.tsx

import React, { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { MapPin, Loader2, X } from "lucide-react";
import CategoryPreviewCard from "@/components/CategoryPreviewCard";
import EventPreviewCard from "@/components/EventPreviewCard";
import { Event, formatDbEvent } from "@/data/events";
import { Category } from "@/data/categories";

type EventWithDistance = Event & { distance?: number };

interface Props {
  categories: Category[];
}

export default function CategoryBrowser({ categories }: Props) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [categoryEvents,     setCategoryEvents]     = useState<EventWithDistance[]>([]);
  const [categoryLoading,    setCategoryLoading]    = useState(false);
  const categoryResultsRef = useRef<HTMLDivElement>(null);

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  const handleCategoryClick = useCallback(async (categoryId: number) => {
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
      if (!res.ok) throw new Error();
      const raw = await res.json();
      const formatted: EventWithDistance[] = (Array.isArray(raw) ? raw : []).map(formatDbEvent);
      const now = new Date().setHours(0, 0, 0, 0);
      setCategoryEvents(formatted.filter(e => new Date(e.date).getTime() >= now));
    } catch {
      setCategoryEvents([]);
    } finally {
      setCategoryLoading(false);
      setTimeout(() => {
        categoryResultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [selectedCategoryId]);

  return (
    <div className="w-full">
      <h2 className="text-gray-300 font-bold text-[1.5rem] mb-4">Browse by Category</h2>

      {/* Category cards */}
      <div className="flex gap-4 overflow-x-auto pb-4 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible">
        {categories.map(category => (
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

      {/* Category results */}
      {selectedCategoryId !== null && (
        <div ref={categoryResultsRef} className="mt-6 w-full">
          {/* Results header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {selectedCategory && (
                <span className="flex items-center justify-center w-8 h-8">
                  <selectedCategory.iconComponent
                    style={{ color: selectedCategory.iconColor, width: "1.5rem", height: "1.5rem" }}
                  />
                </span>
              )}
              <h3 className="text-gray-300 font-bold text-[1.5rem]">
                {selectedCategory?.name ?? "Category"}
              </h3>
            </div>
            <button
              onClick={() => { setSelectedCategoryId(null); setCategoryEvents([]); }}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300
                         border border-gray-700 hover:border-gray-500 rounded-lg px-3 py-1.5
                         transition duration-300"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          </div>

          {categoryLoading && (
            <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">Loading {selectedCategory?.name} events...</span>
            </div>
          )}

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

          {!categoryLoading && categoryEvents.length > 0 && (
            <>
              <p className="text-gray-500 text-sm mb-4">
                {categoryEvents.length} upcoming event{categoryEvents.length !== 1 ? "s" : ""}
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 w-full gap-4">
                {categoryEvents.map(event => (
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
    </div>
  );
}