"use client";
// components/EventVendors.tsx
// Add this component to your app/events/[id]/page.tsx event detail view

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Store, Star, MapPin, Phone, MessageSquare, ChevronRight,
  BadgeCheck, Loader2,
} from "lucide-react";

interface VendorProfile {
  id: string;
  businessName: string;
  category: string;
  tagline: string | null;
  logoImage: string | null;
  coverImage: string | null;
  location: string;
  phone: string;
  rating: number;
  reviewCount: number;
  servicesOffered: string; // what they're offering AT this event
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`w-3 h-3 ${i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-gray-700"}`} />
      ))}
    </div>
  );
}

export default function EventVendors({ eventId }: { eventId: number }) {
  const [vendors, setVendors]   = useState<VendorProfile[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch(`/api/marketplace/applications?eventId=${eventId}`)
      .then(r => r.json())
      .then((apps: any[]) => {
        if (!Array.isArray(apps)) return;
        const approved = apps
          .filter(a => a.status === "approved")
          .map(a => ({ ...a.profile, servicesOffered: a.servicesOffered }));
        setVendors(approved);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) return (
    <div className="flex justify-center py-8">
      <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
    </div>
  );

  if (vendors.length === 0) return null;

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <Store className="w-5 h-5 text-purple-400" />
        <h2 className="text-gray-200 font-bold text-lg">Vendors at This Event</h2>
        <span className="bg-purple-900/50 border border-purple-700/40 text-purple-300 text-xs px-2 py-0.5 rounded-full font-semibold">
          {vendors.length}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {vendors.map(vendor => (
          <Link key={vendor.id} href={`/marketplace/${vendor.id}`}>
            <div className="group flex items-start gap-3 bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-purple-700/50 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-purple-900/20">
              {/* Logo */}
              <div className="w-12 h-12 rounded-xl bg-gray-800 border border-gray-700 overflow-hidden flex items-center justify-center shrink-0">
                {vendor.logoImage
                  ? <img src={vendor.logoImage} alt="" className="w-full h-full object-cover" />
                  : <Store className="w-6 h-6 text-purple-400" />
                }
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="text-gray-200 font-semibold text-sm truncate group-hover:text-purple-300 transition-colors">
                    {vendor.businessName}
                  </p>
                </div>

                <p className="text-purple-400 text-xs font-semibold mb-1">{vendor.category}</p>

                {vendor.servicesOffered && (
                  <p className="text-gray-500 text-xs line-clamp-2 mb-2">{vendor.servicesOffered}</p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {vendor.rating > 0 && (
                      <>
                        <Stars rating={vendor.rating} />
                        <span className="text-gray-600 text-xs">{vendor.rating.toFixed(1)}</span>
                      </>
                    )}
                  </div>
                  <span className="text-gray-600 text-xs flex items-center gap-0.5 group-hover:text-purple-400 transition-colors">
                    View <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}