"use client";
// app/marketplace/[id]/page.tsx
// ApplyModal + vendor-to-event application flow removed.
// Organizers contact vendors directly via the inquiry system.
// "Your Profile" badge shown when viewing your own profile.

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Star, MapPin, Phone, Mail, Globe, Instagram,
  BadgeCheck, ChevronLeft, Send, CheckCircle, Loader2,
  Package, Calendar, MessageSquare, X, ExternalLink, Tag,
  Music2, Utensils, Wine, Mic2, Users, Camera, Tent, Truck,
  Lightbulb, Drama, Car, Flower2, Shield, Printer, Wifi, Store,
  UserCheck,
} from "lucide-react";

interface Listing {
  id: string; title: string; description: string; category: string;
  priceType: string; price: number | null; currency: string;
  images: string[]; tags: string[];
}
interface Review {
  id: string; reviewerName: string; rating: number;
  comment: string | null; createdAt: string;
}
interface ApprovedEvent {
  id: number; title: string; date: string; location: string; image: string;
}
interface Profile {
  id: string; businessName: string; tagline: string | null;
  description: string; category: string; subCategory: string | null;
  location: string; phone: string; email: string;
  website: string | null; instagram: string | null; twitter: string | null;
  coverImage: string | null; logoImage: string | null;
  isVerified: boolean; rating: number; reviewCount: number;
  listings: Listing[];
  reviews:  Review[];
  applications: { event: ApprovedEvent; status: string }[];
}

function Stars({ rating, big }: { rating: number; big?: boolean }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`${big?"w-5 h-5":"w-3.5 h-3.5"} ${i<=Math.round(rating)?"fill-amber-400 text-amber-400":"text-gray-700"}`} />
      ))}
    </div>
  );
}

function PriceLabel({ listing }: { listing: Listing }) {
  if (listing.priceType === "negotiable") return <span className="text-purple-400 font-bold">Negotiable</span>;
  if (listing.priceType === "free")       return <span className="text-green-400 font-bold">Free</span>;
  if (!listing.price) return null;
  const suffix = listing.priceType==="hourly"?"/hr":listing.priceType==="daily"?"/day":"";
  return <span className="text-amber-400 font-bold">{listing.currency} {listing.price.toLocaleString()}{suffix}</span>;
}

// ─── Inquiry Modal ────────────────────────────────────────────────────────────

function InquiryModal({ profile, listing, onClose }: {
  profile: Profile; listing?: Listing; onClose: () => void;
}) {
  const [form, setForm] = useState({ senderName:"", senderEmail:"", senderPhone:"", message:"" });
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSend = async () => {
    setSending(true); setError("");
    try {
      const res = await fetch("/api/marketplace/inquiries", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ profileId: profile.id, listingId: listing?.id ?? null, ...form }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSent(true);
    } catch(e: any) { setError(e.message); }
    finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div>
            <h3 className="text-gray-100 font-bold">Send Inquiry</h3>
            <p className="text-gray-500 text-sm">{listing ? `Re: ${listing.title}` : `To: ${profile.businessName}`}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition"><X className="w-5 h-5"/></button>
        </div>
        {sent ? (
          <div className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <h4 className="text-gray-100 font-bold text-lg mb-1">Inquiry Sent!</h4>
            <p className="text-gray-400 text-sm mb-4">{profile.businessName} will get back to you shortly.</p>
            <button onClick={onClose} className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition">Done</button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 text-xs mb-1.5">Your Name *</label>
                <input value={form.senderName} onChange={e => set("senderName",e.target.value)} placeholder="John Doe"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-gray-200 text-sm focus:outline-none focus:border-purple-600" />
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-1.5">Phone</label>
                <input value={form.senderPhone} onChange={e => set("senderPhone",e.target.value)} placeholder="+254 700 000 000"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-gray-200 text-sm focus:outline-none focus:border-purple-600" />
              </div>
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1.5">Email *</label>
              <input value={form.senderEmail} onChange={e => set("senderEmail",e.target.value)} placeholder="you@example.com"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-gray-200 text-sm focus:outline-none focus:border-purple-600" />
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1.5">Message *</label>
              <textarea value={form.message} onChange={e => set("message",e.target.value)} rows={4}
                placeholder="Describe what you need, event date, budget, guests expected…"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-gray-200 text-sm focus:outline-none focus:border-purple-600 resize-none" />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button onClick={handleSend} disabled={sending || !form.senderName.trim() || !form.senderEmail.trim() || !form.message.trim()}
              className="flex items-center justify-center gap-2 w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition text-sm">
              {sending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}
              Send Message
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Review Form ──────────────────────────────────────────────────────────────

function ReviewForm({ profileId, onDone }: { profileId: string; onDone: () => void }) {
  const [open, setOpen]     = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover]   = useState(0);
  const [form, setForm]     = useState({ reviewerName:"", reviewerEmail:"", comment:"" });
  const [saving, setSaving] = useState(false);
  const [done, setDone]     = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    await fetch("/api/marketplace/reviews", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ profileId, ...form, rating }),
    });
    setSaving(false); setDone(true);
    setTimeout(() => { setOpen(false); onDone(); }, 1500);
  };

  if (!open) return (
    <button onClick={() => setOpen(true)} className="flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-semibold transition">
      <Star className="w-4 h-4"/> Leave a Review
    </button>
  );

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-5 space-y-4">
      <h4 className="text-gray-200 font-semibold">Leave a Review</h4>
      {done ? (
        <div className="flex items-center gap-2 text-green-400"><CheckCircle className="w-5 h-5"/> Review submitted, thank you!</div>
      ) : (
        <>
          <div className="flex gap-1">
            {[1,2,3,4,5].map(i => (
              <button key={i} onClick={() => setRating(i)} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)}>
                <Star className={`w-7 h-7 transition-colors ${i<=(hover||rating)?"fill-amber-400 text-amber-400":"text-gray-700"}`} />
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-400 text-xs mb-1">Your Name *</label>
              <input value={form.reviewerName} onChange={e => setForm(f=>({...f,reviewerName:e.target.value}))}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-purple-600" />
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">Email *</label>
              <input value={form.reviewerEmail} onChange={e => setForm(f=>({...f,reviewerEmail:e.target.value}))}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-purple-600" />
            </div>
          </div>
          <div>
            <label className="block text-gray-400 text-xs mb-1">Comment</label>
            <textarea value={form.comment} onChange={e => setForm(f=>({...f,comment:e.target.value}))} rows={3}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-purple-600 resize-none" />
          </div>
          <div className="flex gap-3">
            <button onClick={handleSubmit} disabled={saving || !rating || !form.reviewerName.trim() || !form.reviewerEmail.trim()}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-semibold px-4 py-2 rounded-lg text-sm transition">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <CheckCircle className="w-3.5 h-3.5"/>}
              Submit
            </button>
            <button onClick={() => setOpen(false)} className="text-gray-500 text-sm hover:text-gray-300 transition">Cancel</button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Profile Page ─────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const params = useParams();
  const id     = params.id as string;
  const { data: session } = useSession();

  const [profile,     setProfile]     = useState<Profile | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [inquiry,     setInquiry]     = useState<Listing | undefined | "general">();
  const [myProfileId, setMyProfileId] = useState<string | null>(null);

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

  const approvedEvents = profile.applications.filter(a => a.status === "approved").map(a => a.event);
  const isOwner        = myProfileId === profile.id;

  return (
    <div className="min-h-screen pt-10 pb-16">
      {/* Cover */}
      <div className="relative h-60 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-purple-950/20 to-transparent" />
        {profile.coverImage && (
          <img src={profile.coverImage} alt="" className="w-full h-full object-cover opacity-50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <a href="/marketplace" className="absolute top-4 left-4 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm text-gray-300 text-sm px-3 py-1.5 rounded-full hover:text-white transition">
          <ChevronLeft className="w-4 h-4"/> Marketplace
        </a>
        {/* "Your Profile" badge — only visible to the owner */}
        {isOwner && (
          <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-purple-600/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full">
            <UserCheck className="w-3.5 h-3.5"/> Your Profile
          </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-16 relative">
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* ── Sidebar ── */}
          <div className="w-full lg:w-80 shrink-0 space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="p-5">
                <div className="flex items-end gap-4 mb-4 -mt-14">
                  <div className="w-20 h-20 rounded-2xl border-4 border-gray-900 bg-gray-800 overflow-hidden shadow-xl flex items-center justify-center shrink-0">
                    {profile.logoImage
                      ? <img src={profile.logoImage} alt="" className="w-full h-full object-cover"/>
                      : <Store className="w-10 h-10 text-purple-400"/>}
                  </div>
                  {profile.isVerified && (
                    <div className="flex items-center gap-1 bg-purple-900/60 border border-purple-700/50 text-purple-300 text-xs px-2.5 py-1 rounded-full font-semibold mb-1">
                      <BadgeCheck className="w-3 h-3"/> Verified
                    </div>
                  )}
                </div>

                <h1 className="text-gray-100 font-black text-xl mb-1">{profile.businessName}</h1>
                {profile.tagline && <p className="text-gray-400 text-sm mb-3 italic">"{profile.tagline}"</p>}

                <div className="flex items-center gap-2 mb-3">
                  <Stars rating={profile.rating}/>
                  <span className="text-gray-300 font-semibold text-sm">{profile.rating > 0 ? profile.rating.toFixed(1) : "No reviews"}</span>
                  {profile.reviewCount > 0 && <span className="text-gray-600 text-xs">({profile.reviewCount} reviews)</span>}
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2 text-gray-400"><MapPin className="w-3.5 h-3.5 text-gray-600 shrink-0"/> {profile.location}</div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <span className="w-3.5 h-3.5 text-xs">📦</span>
                    {profile.category}{profile.subCategory && ` · ${profile.subCategory}`}
                  </div>
                </div>

                <div className="border-t border-gray-800 pt-4 space-y-2 text-sm">
                  <a href={`tel:${profile.phone}`} className="flex items-center gap-2 text-gray-400 hover:text-gray-200 transition">
                    <Phone className="w-3.5 h-3.5 text-green-500"/> {profile.phone}
                  </a>
                  <a href={`mailto:${profile.email}`} className="flex items-center gap-2 text-gray-400 hover:text-gray-200 transition">
                    <Mail className="w-3.5 h-3.5 text-blue-500"/> {profile.email}
                  </a>
                  {profile.website && (
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-400 hover:text-purple-400 transition">
                      <Globe className="w-3.5 h-3.5 text-gray-500"/>
                      <span className="truncate">{profile.website.replace(/^https?:\/\//,"")}</span>
                      <ExternalLink className="w-3 h-3 shrink-0"/>
                    </a>
                  )}
                  {profile.instagram && (
                    <a href={`https://instagram.com/${profile.instagram.replace("@","")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-400 hover:text-pink-400 transition">
                      <Instagram className="w-3.5 h-3.5 text-pink-500"/> {profile.instagram}
                    </a>
                  )}
                </div>
              </div>

              {/* CTA */}
              <div className="px-4 pb-4">
                {isOwner ? (
                  <a href="/marketplace/dashboard"
                    className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition text-sm">
                    <Store className="w-4 h-4"/> Manage My Profile
                  </a>
                ) : (
                  <button onClick={() => setInquiry("general")}
                    className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition text-sm">
                    <MessageSquare className="w-4 h-4"/> Send Message
                  </button>
                )}
              </div>
            </div>

            {/* Approved events */}
            {approvedEvents.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <h3 className="text-gray-300 font-semibold text-sm mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-400"/> Attending Events
                </h3>
                <div className="space-y-2">
                  {approvedEvents.map(ev => (
                    <a key={ev.id} href={`/events/${ev.id}`} className="flex items-center gap-3 hover:bg-gray-800 rounded-xl p-2 transition group">
                      <img src={ev.image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0"/>
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

          {/* ── Main content ── */}
          <div className="flex-1 min-w-0 space-y-6 pt-4 lg:pt-0 w-full">

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <h2 className="text-gray-200 font-bold text-lg mb-2">About</h2>
              <p className="text-gray-400 leading-relaxed whitespace-pre-line">{profile.description}</p>
            </div>

            {profile.listings.length > 0 && (
              <div>
                <h2 className="text-gray-200 font-bold text-lg mb-4">Services & Products</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {profile.listings.map(listing => (
                    <div key={listing.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition group">
                      {listing.images[0] && (
                        <img src={listing.images[0]} alt={listing.title} className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-500"/>
                      )}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="text-gray-200 font-semibold text-sm">{listing.title}</h3>
                          <PriceLabel listing={listing}/>
                        </div>
                        <p className="text-gray-500 text-xs leading-relaxed mb-3 line-clamp-3">{listing.description}</p>
                        {listing.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {listing.tags.map(tag => (
                              <span key={tag} className="flex items-center gap-1 bg-gray-800 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                                <Tag className="w-2.5 h-2.5"/> {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {!isOwner && (
                          <button onClick={() => setInquiry(listing)}
                            className="w-full flex items-center justify-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-purple-700 text-gray-400 hover:text-purple-300 text-xs font-semibold py-2 rounded-xl transition">
                            <MessageSquare className="w-3.5 h-3.5"/> Enquire
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-gray-200 font-bold text-lg">Reviews</h2>
                {!isOwner && <ReviewForm profileId={profile.id} onDone={fetchProfile}/>}
              </div>
              {profile.reviews.length === 0 ? (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
                  <Star className="w-10 h-10 text-gray-700 mx-auto mb-2"/>
                  <p className="text-gray-500 text-sm">No reviews yet — be the first!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {profile.reviews.map(r => (
                    <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-gray-300 text-sm font-semibold">{r.reviewerName}</p>
                          <p className="text-gray-600 text-xs">{new Date(r.createdAt).toLocaleDateString()}</p>
                        </div>
                        <Stars rating={r.rating}/>
                      </div>
                      {r.comment && <p className="text-gray-400 text-sm">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {inquiry && (
        <InquiryModal
          profile={profile}
          listing={inquiry === "general" ? undefined : inquiry}
          onClose={() => setInquiry(undefined)}
        />
      )}
    </div>
  );
}