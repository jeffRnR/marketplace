"use client";
// app/events/_components/EventsBannerSlider.tsx

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Calendar, MapPin, Star, Store, Ticket,
  BadgeCheck, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Event } from "@/data/events";

// ─── Types ────────────────────────────────────────────────────────────────────

type SliderEvent = Event & { distance?: number };

interface VendorProfile {
  id: string;
  businessName: string;
  tagline: string | null;
  category: string;
  location: string;
  logoImage: string | null;
  coverImage: string | null;
  isVerified: boolean;
  rating: number;
}

interface Props {
  events: SliderEvent[];
  vendors: VendorProfile[];
  loading: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-KE", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

function eventPrice(tickets: { type: string; price: string }[]) {
  if (!tickets?.length) return "Free";
  if (tickets[0]?.type === "RSVP") return "RSVP";
  const prices = tickets
    .map(t => parseFloat(t.price.replace(/[^0-9.]/g, "")))
    .filter(Boolean);
  if (!prices.length) return "Free";
  return `From KES ${Math.min(...prices).toLocaleString()}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EventsBannerSlider({ events, vendors, loading }: Props) {
  const [tab,     setTab]     = useState<"events" | "vendors">("events");
  const [index,   setIndex]   = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const items = tab === "events" ? events : vendors;

  const goTo = useCallback((i: number) => {
    setVisible(false);
    setTimeout(() => { setIndex(i); setVisible(true); }, 250);
  }, []);

  const next = useCallback(() => {
    if (!items.length) return;
    goTo((index + 1) % items.length);
  }, [index, items.length, goTo]);

  const prev = useCallback(() => {
    if (!items.length) return;
    goTo((index - 1 + items.length) % items.length);
  }, [index, items.length, goTo]);

  useEffect(() => {
    if (!items.length) return;
    timerRef.current = setInterval(next, 3000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [next, items.length]);

  function switchTab(t: "events" | "vendors") {
    if (t === tab) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setVisible(false);
    setTimeout(() => { setTab(t); setIndex(0); setVisible(true); }, 250);
  }

  const currentEvent  = tab === "events"  ? events[index]  : null;
  const currentVendor = tab === "vendors" ? vendors[index] : null;

  return (
    <div className="flex flex-col items-start">
      {/* Tab toggle */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 border-b-0
                      rounded-t-xl px-1 pt-1 pb-0">
        {(["events", "vendors"] as const).map(t => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-t-lg text-xs font-bold
                        transition-all ${
              tab === t ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {t === "events"
              ? <><Ticket className="w-3.5 h-3.5" /> Events</>
              : <><Store  className="w-3.5 h-3.5" /> Vendors</>}
          </button>
        ))}
      </div>

      {/* Card */}
      <div className="w-full rounded-b-2xl rounded-tr-2xl overflow-hidden
                      border border-gray-800 bg-gray-900 shadow-2xl">
        <div className="relative w-full h-40 sm:h-44 overflow-hidden">

          {/* Loading skeleton */}
          {loading && (
            <div className="w-full h-full bg-gray-800 animate-pulse flex items-center justify-center">
              <p className="text-gray-600 text-sm">Loading…</p>
            </div>
          )}

          {/* Empty */}
          {!loading && items.length === 0 && (
            <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm">
              Nothing here yet
            </div>
          )}

          {!loading && items.length > 0 && (
            <>
              {/* ── Event slide ── */}
              {currentEvent && (
                <Link href={`/events/${currentEvent.id}`}>
                  <div className={`absolute inset-0 cursor-pointer transition-opacity duration-300
                                   ${visible ? "opacity-100" : "opacity-0"}`}>
                    <img
                      src={currentEvent.image}
                      alt={currentEvent.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                      {(currentEvent.categories?.[0] as any)?.category?.name && (
                        <span className="inline-block text-xs bg-purple-600 text-white
                                         px-2.5 py-0.5 rounded-full font-semibold mb-2">
                          {(currentEvent.categories![0] as any).category.name}
                        </span>
                      )}
                      <h3 className="text-white font-black text-lg sm:text-xl leading-tight mb-1">
                        {currentEvent.title}
                      </h3>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1.5 text-gray-300 text-sm">
                          <Calendar className="w-3.5 h-3.5 text-purple-400" />
                          {formatDate(currentEvent.date)}
                        </span>
                        <span className="flex items-center gap-1.5 text-gray-300 text-sm">
                          <MapPin className="w-3.5 h-3.5 text-purple-400" />
                          <span className="truncate max-w-[180px]">{currentEvent.location}</span>
                        </span>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full
                                         bg-green-600 text-white">
                          {eventPrice(currentEvent.tickets)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {/* ── Vendor slide ── */}
              {currentVendor && (
                <Link href={`/marketplace/${currentVendor.id}`}>
                  <div className={`absolute inset-0 cursor-pointer transition-opacity duration-300
                                   ${visible ? "opacity-100" : "opacity-0"}`}>
                    {currentVendor.coverImage
                      ? <img src={currentVendor.coverImage} alt={currentVendor.businessName}
                             className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-gradient-to-br from-purple-900/60 to-gray-800" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 flex items-end gap-3">
                      <div className="w-10 h-10 rounded-xl border-2 border-white/20 bg-gray-800
                                      overflow-hidden flex items-center justify-center shrink-0 shadow-lg">
                        {currentVendor.logoImage
                          ? <img src={currentVendor.logoImage} alt="" className="w-full h-full object-cover" />
                          : <Store className="w-7 h-7 text-purple-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-white font-black text-lg sm:text-xl leading-tight truncate">
                            {currentVendor.businessName}
                          </h3>
                          {currentVendor.isVerified && (
                            <BadgeCheck className="w-5 h-5 text-purple-400 shrink-0" />
                          )}
                        </div>
                        {currentVendor.tagline && (
                          <p className="text-gray-300 text-sm italic mb-1.5 truncate">
                            &quot;{currentVendor.tagline}&quot;
                          </p>
                        )}
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-xs bg-purple-600 text-white px-2.5 py-0.5
                                           rounded-full font-semibold">
                            {currentVendor.category}
                          </span>
                          <span className="flex items-center gap-1 text-gray-300 text-sm">
                            <MapPin className="w-3.5 h-3.5 text-purple-400" />
                            {currentVendor.location}
                          </span>
                          {currentVendor.rating > 0 && (
                            <span className="flex items-center gap-1 text-amber-400 text-sm font-bold">
                              <Star className="w-3.5 h-3.5 fill-amber-400" />
                              {currentVendor.rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {/* Dot indicators */}
              {items.length > 1 && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                  {items.slice(0, 8).map((_, i) => (
                    <button
                      key={i}
                      onClick={e => { e.preventDefault(); goTo(i); }}
                      className={`rounded-full transition-all ${
                        i === index % items.length
                          ? "w-4 h-2 bg-white"
                          : "w-2 h-2 bg-white/30 hover:bg-white/60"
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Prev / Next arrows */}
              {items.length > 1 && (
                <>
                  <button
                    onClick={e => { e.preventDefault(); prev(); }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/20
                               backdrop-blur-sm rounded-full flex items-center justify-center
                               text-white hover:bg-black/70 transition z-10"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={e => { e.preventDefault(); next(); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/20
                               backdrop-blur-sm rounded-full flex items-center justify-center
                               text-white hover:bg-black/70 transition z-10"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}