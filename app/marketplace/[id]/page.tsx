"use client";
// app/marketplace/[id]/page.tsx
// Slim orchestrator — all UI lives in ./components/

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2, ChevronLeft, UserCheck } from "lucide-react";
import ProfileSidebar  from "./components/ProfileSidebar";
import ListingsGrid    from "./components/ListingsGrid";
import ReviewsSection  from "./components/ReviewsSection";

interface Profile {
  id: string; businessName: string; tagline: string | null;
  description: string; category: string; subCategory: string | null;
  location: string; phone: string; email: string;
  website: string | null; instagram: string | null; twitter: string | null;
  facebook: string | null; tiktok: string | null;
  coverImage: string | null; logoImage: string | null;
  isVerified: boolean; rating: number; reviewCount: number;
  listings: any[]; reviews: any[];
  applications: { event: any; status: string }[];
}

export default function ProfilePage() {
  const { id }        = useParams<{ id: string }>();
  const router        = useRouter();
  const { data: session } = useSession();

  const [profile,     setProfile]     = useState<Profile | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [myProfileId, setMyProfileId] = useState<string | null>(null);
  const [msgStarting, setMsgStarting] = useState(false);
  const [msgError,    setMsgError]    = useState("");

  const fetchProfile = useCallback(async () => {
    const res = await fetch(`/api/marketplace/profiles/${id}`);
    if (res.ok) setProfile(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/marketplace/profiles?mine=true")
      .then(r => r.json())
      .then(d => setMyProfileId(d?.id ?? null));
  }, [session]);

  async function startConversation(listingId: string | null) {
    if (!session) { router.push("/auth/signin"); return; }
    if (!profile)  return;
    setMsgStarting(true); setMsgError("");
    try {
      const res  = await fetch("/api/messages", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          vendorProfileId: profile.id,
          listingId:       listingId ?? null,
          initialMessage:  listingId
            ? "Hi, I'm interested in your listing."
            : "Hi, I'd like to get in touch about your services.",
        }),
      });
      const data = await res.json();
      if (!res.ok) { setMsgError(data.error ?? "Could not start conversation"); return; }
      router.push(`/messages?c=${data.conversation.id}`);
    } catch {
      setMsgError("Something went wrong.");
    } finally {
      setMsgStarting(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Vendor not found</p>
    </div>
  );

  const isOwner = myProfileId === profile.id;

  return (
    <div className="min-h-screen pt-10 pb-16">
      {/* Cover */}
      <div className="relative h-52 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-purple-950/20 to-transparent" />
        {profile.coverImage && (
          <img src={profile.coverImage} alt="" className="w-full h-full object-cover opacity-60" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <a href="/marketplace"
          className="absolute top-4 left-4 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm text-gray-300 text-sm px-3 py-1.5 rounded-full hover:text-white transition">
          <ChevronLeft className="w-4 h-4" /> Marketplace
        </a>
        {isOwner && (
          <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-purple-600/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full">
            <UserCheck className="w-3.5 h-3.5" /> Your Profile
          </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-16 relative">
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* Sidebar */}
          <ProfileSidebar
            profile={profile}
            isOwner={isOwner}
            session={session}
            msgStarting={msgStarting}
            onMessage={() => startConversation(null)}
          />

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-6 pt-4 lg:pt-0 w-full">

            {/* About */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h2 className="text-gray-200 font-bold text-lg mb-2">About</h2>
              <p className="text-gray-400 leading-relaxed whitespace-pre-line">{profile.description}</p>
            </div>

            {/* Listings with full gallery */}
            <ListingsGrid
              listings={profile.listings}
              isOwner={isOwner}
              msgStarting={msgStarting}
              msgError={msgError}
              onMessage={startConversation}
            />

            {/* Reviews */}
            <ReviewsSection
              reviews={profile.reviews}
              profileId={profile.id}
              isOwner={isOwner}
              onRefresh={fetchProfile}
            />
          </div>
        </div>
      </div>
    </div>
  );
}