"use client";
// app/marketplace/page.tsx

import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Search,
  SlidersHorizontal,
  Star,
  MapPin,
  ChevronRight,
  BadgeCheck,
  Store,
  X,
  UserCheck,
  Music2,
  Utensils,
  Wine,
  Mic2,
  Users,
  Camera,
  Tent,
  Truck,
  Lightbulb,
  Drama,
  Car,
  Flower2,
  Shield,
  Printer,
  Wifi,
  Package,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { label: "All", icon: Store, value: "" },
  { label: "Venues", icon: Tent, value: "Venue" },
  { label: "Sound & Lighting", icon: Lightbulb, value: "Sound & Lighting" },
  { label: "Catering", icon: Utensils, value: "Catering" },
  { label: "Bar & Alcohol", icon: Wine, value: "Bar & Alcohol" },
  { label: "DJ Services", icon: Music2, value: "DJ Services" },
  { label: "Live Music", icon: Mic2, value: "Live Music" },
  { label: "Photography", icon: Camera, value: "Photography" },
  { label: "Staffing & HR", icon: Users, value: "Staffing & HR" },
  { label: "Decor & Florals", icon: Flower2, value: "Decor & Florals" },
  { label: "Entertainment", icon: Drama, value: "Entertainment" },
  { label: "Transport", icon: Car, value: "Transport" },
  { label: "Logistics", icon: Truck, value: "Logistics" },
  { label: "Security", icon: Shield, value: "Security" },
  { label: "Tech & AV", icon: Wifi, value: "Tech & AV" },
  { label: "Print & Branding", icon: Printer, value: "Print & Branding" },
  { label: "Merchandise", icon: Package, value: "Merchandise" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Listing {
  id: string;
  title: string;
  description: string;
  priceType: string;
  price: number | null;
  currency: string;
  images: string[];
  tags: string[];
  category: string;
}

interface Profile {
  id: string;
  businessName: string;
  tagline: string | null;
  description: string;
  category: string;
  subCategory: string | null;
  location: string;
  phone: string;
  email: string;
  website: string | null;
  instagram: string | null;
  coverImage: string | null;
  logoImage: string | null;
  isVerified: boolean;
  rating: number;
  reviewCount: number;
  listings: Listing[];
  _count?: { reviews: number; listings: number };
}

// ─── Star renderer ────────────────────────────────────────────────────────────

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-gray-600"}`}
        />
      ))}
    </div>
  );
}

// ─── Price badge ──────────────────────────────────────────────────────────────

function PriceBadge({ listing }: { listing: Listing }) {
  if (listing.priceType === "negotiable")
    return (
      <span className="text-xs text-green-400 font-semibold">Negotiable</span>
    );
  if (listing.priceType === "free")
    return <span className="text-xs text-green-400 font-semibold">Free</span>;
  if (!listing.price) return null;
  const suffix =
    listing.priceType === "hourly"
      ? "/hr"
      : listing.priceType === "daily"
        ? "/day"
        : "";
  return (
    <span className="text-xs text-green-400 font-semibold">
      {listing.currency} {listing.price.toLocaleString()}
      {suffix}
    </span>
  );
}

// ─── Profile Card ─────────────────────────────────────────────────────────────

function ProfileCard({
  profile,
  isMyProfile,
}: {
  profile: Profile;
  isMyProfile: boolean;
}) {
  const catIcon = CATEGORIES.find((c) => c.value === profile.category);
  const Icon = catIcon?.icon ?? Store;
  const topListing = profile.listings[0];

  return (
    <Link href={`/marketplace/${profile.id}`} className="group block">
      <div className="relative bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-purple-700/60 transition-all duration-300 hover:shadow-xl hover:shadow-purple-900/20 hover:-translate-y-0.5">
        {/* Cover */}
        <div className="relative h-36 bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden">
          {profile.coverImage ? (
            <img
              src={profile.coverImage}
              alt=""
              className="w-full h-full object-cover opacity-60 group-hover:opacity-75 group-hover:scale-105 transition-all duration-500"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center opacity-10">
              <Icon className="w-24 h-24" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/20 to-transparent" />

          <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
            {profile.isVerified && (
              <div className="flex items-center gap-1 bg-purple-600/90 text-white text-xs px-2 py-1 rounded-full font-semibold">
                <BadgeCheck className="w-3 h-3" /> Verified
              </div>
            )}
            {isMyProfile && (
              <div className="flex items-center gap-1 bg-green-600/90 text-white text-xs px-2 py-1 rounded-full font-semibold">
                <UserCheck className="w-3 h-3" /> Your Profile
              </div>
            )}
          </div>

          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-gray-300 text-xs px-2.5 py-1 rounded-full">
            <Icon className="w-3 h-3" />
            <span>{profile.category}</span>
          </div>
        </div>

        {/* Logo */}
        <div className="relative px-4 -mt-6">
          <div className="w-12 h-12 rounded-xl border-2 border-gray-800 bg-gray-800 overflow-hidden shadow-lg flex items-center justify-center">
            {profile.logoImage ? (
              <img
                src={profile.logoImage}
                alt=""
                className="w-full h-full object-fit"
              />
            ) : (
              <Icon className="w-6 h-6 text-purple-400" />
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-4 pt-2 pb-4">
          <h3 className="font-bold text-gray-100 text-base leading-tight group-hover:text-purple-300 transition-colors mb-1">
            {profile.businessName}
          </h3>

          {profile.tagline && (
            <p className="text-gray-400 text-xs mb-2 leading-snug line-clamp-1">
              {profile.tagline}
            </p>
          )}

          <div className="flex items-center gap-2 mb-3">
            <Stars rating={profile.rating} />
            <span className="text-gray-500 text-xs">
              {profile.rating > 0 ? profile.rating.toFixed(1) : "No reviews"}
              {profile.reviewCount > 0 && ` (${profile.reviewCount})`}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-3">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{profile.location}</span>
          </div>

          {topListing && (
            <div className="bg-gray-800/60 rounded-xl p-2.5 mb-3 border border-gray-700/50">
              <div className="flex justify-between items-start gap-2">
                <p className="text-gray-300 text-xs font-medium truncate">
                  {topListing.title}
                </p>
                <PriceBadge listing={topListing} />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-gray-600 text-xs">
              {profile._count?.listings ?? profile.listings.length} listing
              {(profile._count?.listings ?? profile.listings.length) !== 1
                ? "s"
                : ""}
            </span>
            <span className="text-purple-400 text-xs font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
              View profile <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MarketplacePage() {
  const { data: session } = useSession();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [debouncedSearch, setDebounced] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/marketplace/profiles?${params}`);
      const data = await res.json();
      setProfiles(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [category, debouncedSearch]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/marketplace/profiles?mine=true")
      .then((r) => r.json())
      .then((d) => setMyProfile(d && d.id ? d : null))
      .catch(() => {});
  }, [session]);

  return (
    // ↓ removed bg-gray-950 — inherits system default background
    <div className="min-h-screen pt-20">
      {/* Hero — no absolute background overlays, no decorative grid */}
      <div className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-14">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-4xl lg:text-5xl font-black text-gray-100 leading-tight mb-3">
                Noizy
                <br />
                <span>Marketplace</span>
              </h1>
              <p className="text-gray-400 text-lg max-w-lg">
                Find venues, sound engineers, caterers, DJs, photographers and
                every service your event needs — all in one place.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {session?.user ? (
                myProfile ? (
                  // ↓ w-full on mobile, auto on sm+
                  <Link
                    href="/marketplace/dashboard"
                    className="w-full sm:w-auto"
                  >
                    <button className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-3 rounded-xl transition">
                      <Store className="w-4 h-4" /> Manage My Profile
                    </button>
                  </Link>
                ) : (
                  <Link
                    href="/marketplace/create-profile"
                    className="w-full sm:w-auto"
                  >
                    <button className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-gray-100 font-bold px-6 py-3 rounded-xl transition">
                      <Store className="w-4 h-4" /> Create Market Profile
                    </button>
                  </Link>
                )
              ) : (
                <p className="text-gray-500 text-sm">
                  Sign in to list your services
                </p>
              )}

              <div className="flex gap-3 text-center">
                <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 flex-1">
                  <p className="text-gray-100 font-bold text-lg">
                    {profiles.length}
                  </p>
                  <p className="text-gray-500 text-xs">Vendors</p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 flex-1">
                  <p className="text-gray-100 font-bold text-lg">
                    {CATEGORIES.length - 1}
                  </p>
                  <p className="text-gray-500 text-xs">Categories</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Search + filter bar */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vendors, services, locations…"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-purple-600 transition"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition ${
              showFilters || category
                ? "bg-purple-600 border-purple-600 text-white"
                : "bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filter</span>
            {category && (
              <span className="bg-white/20 rounded-full w-4 h-4 text-xs flex items-center justify-center">
                1
              </span>
            )}
          </button>
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
          {CATEGORIES.map((cat) => {
            const CIcon = cat.icon;
            const active = category === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition shrink-0 ${
                  active
                    ? "bg-purple-600 border-purple-600 text-white"
                    : "bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200"
                }`}
              >
                <CIcon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Active filter summary */}
        {(category || debouncedSearch) && (
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <span className="text-gray-500 text-sm">Showing results for:</span>
            {category && (
              <span className="flex items-center gap-1 bg-purple-900/40 border border-purple-700/50 text-purple-300 text-xs px-3 py-1 rounded-full">
                {category}
                <button onClick={() => setCategory("")}>
                  <X className="w-3 h-3 ml-1" />
                </button>
              </span>
            )}
            {debouncedSearch && (
              <span className="flex items-center gap-1 bg-gray-800 border border-gray-700 text-gray-300 text-xs px-3 py-1 rounded-full">
                "{debouncedSearch}"
                <button onClick={() => setSearch("")}>
                  <X className="w-3 h-3 ml-1" />
                </button>
              </span>
            )}
            <span className="text-gray-600 text-xs">
              {profiles.length} result{profiles.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden animate-pulse"
              >
                <div className="h-36 bg-gray-800" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-800 rounded w-2/3" />
                  <div className="h-3 bg-gray-800 rounded w-full" />
                  <div className="h-3 bg-gray-800 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-20">
            <Store className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <h3 className="text-gray-400 font-semibold text-lg mb-2">
              No vendors found
            </h3>
            <p className="text-gray-600 text-sm mb-6">
              {category || debouncedSearch
                ? "Try adjusting your filters"
                : "Be the first to list your services"}
            </p>
            {session?.user && !myProfile && (
              <Link href="/marketplace/create-profile">
                <button className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-3 rounded-xl transition text-sm">
                  List Your Services
                </button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {profiles.map((p) => (
              <ProfileCard
                key={p.id}
                profile={p}
                isMyProfile={myProfile?.id === p.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
