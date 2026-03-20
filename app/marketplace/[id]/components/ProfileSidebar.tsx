"use client";
// app/marketplace/[id]/components/ProfileSidebar.tsx

import {
  Star, MapPin, Phone, Mail, Globe, Instagram,
  BadgeCheck, Calendar, ExternalLink, Store,
  MessageSquare, UserCheck, Facebook, Twitter, Music2,
} from "lucide-react";

interface Profile {
  id: string; businessName: string; tagline: string | null;
  description: string; category: string; subCategory: string | null;
  location: string; phone: string; email: string;
  website: string | null; instagram: string | null; twitter: string | null;
  facebook: string | null; tiktok: string | null;
  coverImage: string | null; logoImage: string | null;
  isVerified: boolean; rating: number; reviewCount: number;
  applications: { event: { id: number; title: string; date: string; location: string; image: string }; status: string }[];
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`w-3.5 h-3.5 ${i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-gray-700"}`} />
      ))}
    </div>
  );
}

interface Props {
  profile:        Profile;
  isOwner:        boolean;
  session:        any;
  msgStarting:    boolean;
  onMessage:      () => void;
}

export default function ProfileSidebar({ profile, isOwner, session, msgStarting, onMessage }: Props) {
  const approvedEvents = profile.applications.filter(a => a.status === "approved").map(a => a.event);

  return (
    <div className="w-full lg:w-80 shrink-0 space-y-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl">
        <div className="p-5">
          {/* Logo + verified */}
          <div className="flex items-end gap-4 mb-4 -mt-14">
            <div className="w-16 h-16 rounded-2xl border border-gray-700 bg-gray-800 overflow-hidden shadow-xl flex items-center justify-center shrink-0">
              {profile.logoImage
                ? <img src={profile.logoImage} alt="" className="w-full h-full object-cover rounded-2xl" />
                : <Store className="w-10 h-10 text-purple-400" />}
            </div>
            {profile.isVerified && (
              <div className="flex items-center gap-1 bg-purple-900/60 border border-purple-700/50 text-purple-300 text-xs px-2.5 py-1 rounded-full font-semibold mb-1">
                <BadgeCheck className="w-3 h-3" /> Verified
              </div>
            )}
          </div>

          <h1 className="text-gray-100 font-black text-xl mb-1">{profile.businessName}</h1>
          {profile.tagline && <p className="text-gray-400 text-sm mb-3 italic">"{profile.tagline}"</p>}

          <div className="flex items-center gap-2 mb-3">
            <Stars rating={profile.rating} />
            <span className="text-gray-300 font-semibold text-sm">
              {profile.rating > 0 ? profile.rating.toFixed(1) : "No reviews"}
            </span>
            {profile.reviewCount > 0 && (
              <span className="text-gray-600 text-xs">({profile.reviewCount} reviews)</span>
            )}
          </div>

          <div className="space-y-2 text-sm mb-4">
            <div className="flex items-center gap-2 text-gray-400">
              <MapPin className="w-3.5 h-3.5 text-gray-600 shrink-0" /> {profile.location}
            </div>
            <div className="text-gray-400">
              {profile.category}{profile.subCategory && ` · ${profile.subCategory}`}
            </div>
          </div>

          <div className="border-t border-gray-800 pt-4 space-y-2 text-sm">
            <a href={`tel:${profile.phone}`} className="flex items-center gap-2 text-gray-400 hover:text-purple-400 transition">
              <Phone className="w-3.5 h-3.5" /> {profile.phone}
            </a>
            <a href={`mailto:${profile.email}`} className="flex items-center gap-2 text-gray-400 hover:text-purple-400 transition">
              <Mail className="w-3.5 h-3.5" /> {profile.email}
            </a>
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-400 hover:text-purple-400 transition">
                <Globe className="w-3.5 h-3.5" />
                <span className="truncate">{profile.website.replace(/^https?:\/\//, "")}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            )}

            {/* Social icons */}
            <div className="flex gap-3 pt-2">
              {profile.instagram && (
                <a href={`https://instagram.com/${profile.instagram.replace("@","")}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-400 transition">
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {profile.facebook && (
                <a href={`https://facebook.com/${profile.facebook.replace("@","")}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-400 transition">
                  <Facebook className="w-5 h-5" />
                </a>
              )}
              {profile.twitter && (
                <a href={`https://x.com/${profile.twitter.replace("@","")}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-sky-400 transition">
                  <Twitter className="w-5 h-5" />
                </a>
              )}
              {profile.tiktok && (
                <a href={`https://tiktok.com/${profile.tiktok.replace("@","")}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition">
                  <Music2 className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="px-4 pb-4 flex flex-col gap-2">
          {isOwner ? (
            <a href="/marketplace/dashboard"
              className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition text-sm">
              <Store className="w-4 h-4" /> Manage My Profile
            </a>
          ) : (
            <>
              <button
                onClick={onMessage}
                disabled={msgStarting}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition text-sm"
              >
                <MessageSquare className="w-4 h-4" />
                {msgStarting ? "Opening…" : "Send Message"}
              </button>
              {!session && (
                <p className="text-gray-600 text-xs text-center">
                  <a href="/auth/signin" className="text-purple-400 hover:underline">Sign in</a> to message or book
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Approved events */}
      {approvedEvents.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <h3 className="text-gray-300 font-semibold text-sm mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-400" /> Attending Events
          </h3>
          <div className="space-y-2">
            {approvedEvents.map(ev => (
              <a key={ev.id} href={`/events/${ev.id}`} className="flex items-center gap-3 hover:bg-gray-800 rounded-xl p-2 transition group">
                <img src={ev.image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                <div className="min-w-0">
                  <p className="text-gray-300 text-xs font-semibold truncate group-hover:text-purple-300 transition">{ev.title}</p>
                  <p className="text-gray-600 text-xs">{new Date(ev.date).toLocaleDateString()}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}