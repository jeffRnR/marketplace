"use client";
// app/events/_components/CategoryBrowser.tsx

import React, { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { MapPin, Loader2, X } from "lucide-react";
import CategoryPreviewCard from "@/components/CategoryPreviewCard";
import EventPreviewCard from "@/components/EventPreviewCard";
import { Event, formatDbEvent } from "@/data/events";
import type { CategoryRecord } from "@/types/category";
import { getCategoryIcon } from "@/lib/categoryIcons";

type EventWithDistance = Event & { distance?: number };

interface Props {
  categories: CategoryRecord[];
  loading: boolean;
  error: string;
}

export default function CategoryBrowser({ categories, loading, error }: Props) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoryEvents,     setCategoryEvents]     = useState<EventWithDistance[]>([]);
  const [categoryLoading,    setCategoryLoading]    = useState(false);
  const categoryResultsRef = useRef<HTMLDivElement>(null);

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const SelectedCategoryIcon = getCategoryIcon(selectedCategory?.icon);

  const handleCategoryClick = useCallback(async (categoryId: string) => {
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
      <h2 className="text-[var(--foreground)] font-bold text-[1.5rem] mb-4">Browse by Category</h2>

      {/* Category cards */}
      {loading ? (
        <p className="py-6 text-sm text-[var(--muted)]">Loading categories...</p>
      ) : error ? (
        <p role="alert" className="py-6 text-sm text-red-400">{error}</p>
      ) : categories.length === 0 ? (
        <p className="py-6 text-sm text-[var(--muted)]">No categories are available.</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible">
          {categories.map(category => (
            <CategoryPreviewCard
              key={category.id}
              name={category.name}
              eventsCount={category.eventsCount}
              icon={getCategoryIcon(category.icon)}
              iconColor={category.iconColor ?? undefined}
              selected={selectedCategoryId === category.id}
              onClick={() => handleCategoryClick(category.id)}
              className="border-[0.5px] border-[var(--brand-purple)]/35 bg-[var(--surface)] transition duration-300 hover:-translate-y-1 hover:border-[var(--brand-purple)]"
            />
          ))}
        </div>
      )}

      {/* Category results */}
      {selectedCategoryId !== null && (
        <div ref={categoryResultsRef} className="mt-6 w-full">
          {/* Results header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {selectedCategory && (
                <span className="flex items-center justify-center w-8 h-8">
                  <SelectedCategoryIcon
                    style={{ color: selectedCategory.iconColor ?? undefined, width: "1.5rem", height: "1.5rem" }}
                  />
                </span>
              )}
              <h3 className="text-[var(--foreground)] font-bold text-[1.5rem]">
                {selectedCategory?.name ?? "Category"}
              </h3>
            </div>
            <button
              onClick={() => { setSelectedCategoryId(null); setCategoryEvents([]); }}
                className="flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]
                         border-[0.5px] border-[var(--brand-purple)]/30 hover:border-[var(--brand-purple)] rounded-lg px-3 py-1.5
                         transition duration-300"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          </div>

          {categoryLoading && (
            <div className="flex items-center justify-center py-16 gap-3 text-[var(--muted)]">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">Loading {selectedCategory?.name} events...</span>
            </div>
          )}

          {!categoryLoading && categoryEvents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-[var(--muted)] gap-2">
              <MapPin className="w-8 h-8 opacity-40" />
              <p className="text-sm">No upcoming events in this category.</p>
              <Link
                href="/events/create"
                className="mt-2 text-[#8ce0c1] hover:text-white text-sm font-medium transition"
              >
                Create one →
              </Link>
            </div>
          )}

          {!categoryLoading && categoryEvents.length > 0 && (
            <>
              <p className="text-[#6d7c75] text-sm mb-4">
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