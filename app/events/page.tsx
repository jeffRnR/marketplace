"use client";
// app/events/page.tsx

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { formatDbEvent, Event } from "@/data/events";
import { categories as staticCategories, Category } from "@/data/categories";
import SignInModal from "@/components/SignInModal";

import EventsBannerSlider from "./_components/EventsBannerSlider";
import CreateEventCTA     from "./_components/CreateEventCTA";
import UpcomingEvents     from "./_components/UpcomingEvents";
import CategoryBrowser    from "./_components/CategoryBrowser";
import LocationBrowser    from "./_components/LocationBrowser";

type EventWithDistance = Event & { distance?: number };

interface VendorProfile {
  id: string; businessName: string; tagline: string | null;
  category: string; location: string;
  logoImage: string | null; coverImage: string | null;
  isVerified: boolean; rating: number;
  _count: { listings: number; reviews: number };
}

export default function EventsPage() {
  const { data: session, status } = useSession();

  const [events,          setEvents]          = useState<EventWithDistance[]>([]);
  const [vendors,         setVendors]         = useState<VendorProfile[]>([]);
  const [categories,      setCategories]      = useState<Category[]>(staticCategories);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState<string | null>(null);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [myId,            setMyId]            = useState<string | null>(null);

  const isAuthenticated = status === "authenticated";
  const isLoading       = status === "loading";
  const isEventOwner    = isAuthenticated && events.length > 0;

  // Fetch current user ID
  useEffect(() => {
    if (!session?.user?.email) return;
    fetch("/api/auth/session")
      .then(r => r.json())
      .then(s => setMyId((s as any)?.user?.id ?? null))
      .catch(() => {});
  }, [session]);

  // Fetch events + vendors
  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true); setError(null);
        const [eventsRes, vendorsRes] = await Promise.all([
          fetch("/api/events"),
          fetch("/api/marketplace/profiles"),
        ]);
        const rawEvents  = eventsRes.ok  ? await eventsRes.json()  : [];
        const rawVendors = vendorsRes.ok ? await vendorsRes.json() : [];

        const formatted: EventWithDistance[] = (Array.isArray(rawEvents) ? rawEvents : []).map(formatDbEvent);
        const now = new Date().setHours(0, 0, 0, 0);
        setEvents(formatted.filter(e => new Date(e.date).getTime() >= now));
        setVendors(Array.isArray(rawVendors) ? rawVendors.slice(0, 12) : []);
      } catch (err: any) {
        setError("Could not load events. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Fetch live category counts
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/categories");
        if (!res.ok) return;
        const live: { id: number; name: string; eventsCount: number }[] = await res.json();
        setCategories(prev =>
          prev.map(cat => {
            const match = live.find(l => l.id === cat.id);
            return match ? { ...cat, eventsCount: match.eventsCount } : cat;
          })
        );
      } catch { /* keep static */ }
    })();
  }, []);

  return (
    <div className="p-4 lg:w-[70%] mt-14 mx-auto w-full min-h-screen flex flex-col gap-8">

      <EventsBannerSlider
        events={events.slice(0, 12)}
        vendors={vendors}
        loading={loading}
      />

      <CreateEventCTA
        isAuthenticated={isAuthenticated}
        isLoading={isLoading}
        isEventOwner={isEventOwner}
        onSignIn={() => setShowSignInModal(true)}
      />

      <div className="w-full">
        <h1 className="text-gray-300 font-bold text-[2.5rem]">Discover Events</h1>
        <p className="text-gray-400 text-md">
          Find upcoming events — search by name, location, or sort by proximity.
        </p>
      </div>

      {/* Pass myId so UpcomingEvents can show "Your Event" badge */}
      <UpcomingEvents
        events={events}
        loading={loading}
        error={error}
        // myId={myId}
      />

      <CategoryBrowser categories={categories} />
      <LocationBrowser events={events} loading={loading} />

      {showSignInModal && <SignInModal onClose={() => setShowSignInModal(false)} />}
    </div>
  );
}