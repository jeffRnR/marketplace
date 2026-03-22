"use client";
// app/components/LandingPage.tsx

import { useSession } from "next-auth/react";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowUpRight, MapPin, Calendar, Star, Store,
  Ticket, BadgeCheck, ChevronLeft, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import SignInModal from "@/components/SignInModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Event {
  id: number; title: string; image: string; date: string; location: string;
  tickets: { type: string; price: string }[];
  categories: { category: { name: string } }[];
}

interface VendorProfile {
  id: string; businessName: string; tagline: string | null;
  category: string; location: string;
  logoImage: string | null; coverImage: string | null;
  isVerified: boolean; rating: number;
  _count: { listings: number; reviews: number };
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

// ─── Banner slider ────────────────────────────────────────────────────────────

function BannerSlider({
  events, vendors, loading,
}: {
  events: Event[]; vendors: VendorProfile[]; loading: boolean;
}) {
  const [tab,     setTab]     = useState<"events" | "vendors">("events");
  const [index,   setIndex]   = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const items = tab === "events" ? events : vendors;

  // Fade-swap helper
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

  // Auto-advance only the active tab
  useEffect(() => {
    if (!items.length) return;
    timerRef.current = setInterval(next, 3000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [next, items.length]);

  // Manual tab switch — user controls this, timer keeps running for new tab
  function switchTab(t: "events" | "vendors") {
    if (t === tab) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setVisible(false);
    setTimeout(() => {
      setTab(t);
      setIndex(0);
      setVisible(true);
    }, 250);
  }

  const currentEvent  = tab === "events"  ? (events[index]  as Event)        : null;
  const currentVendor = tab === "vendors" ? (vendors[index] as VendorProfile) : null;

  return (
    <div className="flex flex-col items-start">

      {/* Toggle — only as wide as its buttons, sits flush on top of card */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 border-b-0 rounded-t-xl px-1.5 pt-1.5 pb-0">
        {(["events", "vendors"] as const).map(t => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`flex items-center gap-1.5 p-4 py-1.5 rounded-t-lg text-xs font-bold transition-all ${
              tab === t
                ? "bg-gray-800 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {t === "events"
              ? <><Ticket className="w-3.5 h-3.5" /> Events</>
              : <><Store  className="w-3.5 h-3.5" /> Vendors</>}
          </button>
        ))}
      </div>

      {/* Card */}
      <div className="w-full rounded-b-2xl rounded-tr-2xl overflow-hidden border border-gray-800 bg-gray-900 shadow-2xl">

        {/* Slide area */}
        <div className="relative w-full h-54 sm:h-60 overflow-hidden">
          {loading ? (
            <div className="w-full h-full bg-gray-800 animate-pulse flex items-center justify-center">
              <p className="text-gray-600 text-sm">Loading…</p>
            </div>
          ) : items.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm">
              Nothing here yet
            </div>
          ) : (
            <>
              {/* Event slide */}
              {currentEvent && (
                <Link href={`/events/${currentEvent.id}`}>
                  <div className={`absolute inset-0 cursor-pointer transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}>
                    <img src={currentEvent.image} alt={currentEvent.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      {currentEvent.categories?.[0]?.category?.name && (
                        <span className="inline-block text-xs bg-purple-600 text-white px-2.5 py-0.5 rounded-full font-semibold mb-2">
                          {currentEvent.categories[0].category.name}
                        </span>
                      )}
                      <h3 className="text-white font-black text-xl sm:text-2xl leading-tight mb-2">
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
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          eventPrice(currentEvent.tickets).includes("Free")
                            ? "bg-green-600 text-white"
                            : "bg-green-600 text-white"
                        }`}>
                          {eventPrice(currentEvent.tickets)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {/* Vendor slide */}
              {currentVendor && (
                <Link href={`/marketplace/${currentVendor.id}`}>
                  <div className={`absolute inset-0 cursor-pointer transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}>
                    {currentVendor.coverImage
                      ? <img src={currentVendor.coverImage} alt={currentVendor.businessName} className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-gradient-to-br from-purple-900/60 to-gray-800" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end gap-4">
                      <div className="w-14 h-14 rounded-2xl border-2 border-white/20 bg-gray-800 overflow-hidden flex items-center justify-center shrink-0 shadow-lg">
                        {currentVendor.logoImage
                          ? <img src={currentVendor.logoImage} alt="" className="w-full h-full object-cover" />
                          : <Store className="w-7 h-7 text-purple-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-white font-black text-xl sm:text-2xl leading-tight truncate">
                            {currentVendor.businessName}
                          </h3>
                          {currentVendor.isVerified && <BadgeCheck className="w-5 h-5 text-purple-400 shrink-0" />}
                        </div>
                        {currentVendor.tagline && (
                          <p className="text-gray-300 text-sm italic mb-1.5 truncate">"{currentVendor.tagline}"</p>
                        )}
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-xs bg-purple-600 text-white px-2.5 py-0.5 rounded-full font-semibold">
                            {currentVendor.category}
                          </span>
                          <span className="flex items-center gap-1 text-gray-300 text-sm">
                            <MapPin className="w-3.5 h-3.5 text-purple-400" />{currentVendor.location}
                          </span>
                          {currentVendor.rating > 0 && (
                            <span className="flex items-center gap-1 text-amber-400 text-sm font-bold">
                              <Star className="w-3.5 h-3.5 fill-amber-400" />{currentVendor.rating.toFixed(1)}
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
                    <button key={i} onClick={e => { e.preventDefault(); goTo(i); }}
                      className={`rounded-full transition-all ${
                        i === index % items.length
                          ? "w-4 h-2 bg-white"
                          : "w-2 h-2 bg-white/30 hover:bg-white/60"
                      }`} />
                  ))}
                </div>
              )}

              {/* Prev / Next arrows */}
              {items.length > 1 && (
                <>
                  <button onClick={e => { e.preventDefault(); prev(); }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition z-10">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={e => { e.preventDefault(); next(); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition z-10">
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

// ─── Main component ───────────────────────────────────────────────────────────

function LandingPage() {
  const { data: session, status } = useSession();
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [events,          setEvents]          = useState<Event[]>([]);
  const [vendors,         setVendors]         = useState<VendorProfile[]>([]);
  const [loading,         setLoading]         = useState(true);

  const isAuthenticated = status === "authenticated";
  const isLoading       = status === "loading";

  useEffect(() => {
    Promise.all([
      fetch("/api/events").then(r => r.json()).catch(() => []),
      fetch("/api/marketplace/profiles").then(r => r.json()).catch(() => []),
    ]).then(([eventsData, vendorsData]) => {
      const now = new Date();
      setEvents(
        (Array.isArray(eventsData) ? eventsData : [])
          .filter((e: Event) => new Date(e.date) >= now)
          .slice(0, 12)
      );
      setVendors(Array.isArray(vendorsData) ? vendorsData.slice(0, 12) : []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="w-full min-h-screen flex flex-col items-center pt-20 pb-16">
      <div className="w-full lg:w-[70%] px-4 flex flex-col gap-8">

        {/* ── Banner slider ── */}
        <BannerSlider events={events} vendors={vendors} loading={loading} />

        {/* ── Compact hero ── */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex flex-col gap-3 lg:max-w-[55%] text-center lg:text-left">
            <h1 className="text-4xl lg:text-5xl font-black bg-gradient-to-r from-green-600 via-purple-400 to-purple-600 bg-clip-text text-transparent leading-tight">
              Noizy Hub
            </h1>
            <p className="text-gray-300 text-lg leading-relaxed">
              This is a vibrant, multi-vendor e-ticketing platform that connects
              event brands with their audience. Create, share, and discover
              unforgettable experiences.
            </p>
            <div className="flex gap-3 justify-center lg:justify-start flex-wrap mt-1">
              {isLoading ? (
                <div className="bg-gray-800 rounded-lg px-4 py-2 animate-pulse w-32 h-10" />
              ) : isAuthenticated ? (
                <>
                  <Link href="/my-events">
                    <button className="bg-gray-200 text-gray-800 rounded-lg px-4 py-2 text-md font-bold border border-gray-400 hover:bg-transparent hover:text-gray-300 transition flex items-center gap-2">
                      My Events <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </Link>
                  <Link href="/events/create">
                    <button className="bg-gray-800 border border-gray-700 text-gray-300 font-semibold px-4 py-2 rounded-lg text-md hover:bg-gray-700 transition">
                      Create Event
                    </button>
                  </Link>
                </>
              ) : (
                <button onClick={() => setShowSignInModal(true)}
                  className="bg-gray-200 text-gray-800 rounded-lg px-4 py-2 text-md font-bold border border-gray-400 hover:bg-transparent hover:text-gray-300 transition flex items-center gap-2">
                  Sign in to create event <ArrowUpRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Video — no border or outline */}
          <video
            className="w-[300px] h-[300px] lg:w-[350px] lg:h-[350px] rounded-full object-cover shadow-lg shrink-0"
            autoPlay loop muted playsInline
          >
            <source src="/videos/vid1.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>

        {/* ── Bottom CTA (logged-out only) ── */}
        {!isAuthenticated && !isLoading && (
          <div className="text-center py-8 border-t border-gray-800">
            <h3 className="text-gray-100 font-black text-2xl mb-2">Ready to join?</h3>
            <p className="text-gray-500 text-sm mb-6">
              Create events, list your services, and reach thousands of people.
            </p>
            <button onClick={() => setShowSignInModal(true)}
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold px-8 py-3 rounded-xl text-sm transition">
              Get Started Free <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {showSignInModal && <SignInModal onClose={() => setShowSignInModal(false)} />}
    </div>
  );
}

export default LandingPage;