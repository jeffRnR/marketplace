"use client";
// app/marketplace/dashboard/page.tsx

import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Store, Loader2, BadgeCheck, Star, Eye } from "lucide-react";

import { Profile } from "./components/types";
import ListingForm    from "./components/ListingForm";
import InquiryRow     from "./components/InquiryRow";
import SettingsTab    from "./components/SettingsTab";
import WalletTab      from "./components/WalletTab";
import {
  Edit2, Trash2, Eye as EyeIcon, EyeOff, Plus,
  Package, MessageSquare, AlertCircle, MoreVertical,
} from "lucide-react";

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [profile,        setProfile]        = useState<Profile | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [tab,            setTab]            = useState<"listings"|"inquiries"|"wallet"|"settings">("listings");
  const [showAdd,        setShowAdd]        = useState(false);
  const [editId,         setEditId]         = useState<string | null>(null);
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState("");
  const [settingsForm,   setSettingsForm]   = useState<any>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  // Per-listing action menu open state (mobile)
  const [openMenuId,     setOpenMenuId]     = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const res  = await fetch("/api/marketplace/profiles?mine=true");
      const data = await res.json();
      if (data?.id) {
        setProfile(data);
        setSettingsForm({
          businessName: data.businessName, tagline:    data.tagline    ?? "",
          description:  data.description,  location:   data.location,
          phone:        data.phone,         email:      data.email,
          website:      data.website       ?? "",       instagram: data.instagram ?? "",
          coverImage:   data.coverImage    ?? "",       logoImage: data.logoImage  ?? "",
          isActive:     data.isActive,
        });
      } else {
        router.push("/marketplace/create-profile");
      }
    } finally { setLoading(false); }
  }, [router]);

  useEffect(() => { if (session?.user) fetchProfile(); }, [session, fetchProfile]);

  // Close action menu when tapping elsewhere
  useEffect(() => {
    if (!openMenuId) return;
    const handler = () => setOpenMenuId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [openMenuId]);

  if (!session?.user) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Sign in to access your dashboard</p>
    </div>
  );
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
    </div>
  );
  if (!profile) return null;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleAddListing    = async (data: any) => { setSaving(true); setError(""); try { const res = await fetch("/api/marketplace/listings", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) }); if (!res.ok) throw new Error((await res.json()).error); setShowAdd(false); await fetchProfile(); } catch(e:any){setError(e.message);} finally{setSaving(false);} };
  const handleUpdateListing = async (data: any) => { setSaving(true); setError(""); try { const res = await fetch("/api/marketplace/listings", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) }); if (!res.ok) throw new Error((await res.json()).error); setEditId(null); await fetchProfile(); } catch(e:any){setError(e.message);} finally{setSaving(false);} };
  const handleToggleListing = async (id: string, isActive: boolean) => { await fetch("/api/marketplace/listings", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({id,isActive}) }); await fetchProfile(); };
  const handleDeleteListing = async (id: string) => { if (!confirm("Delete this listing?")) return; await fetch(`/api/marketplace/listings?id=${id}`, { method:"DELETE" }); await fetchProfile(); };
  const handleReply         = async (id: string, reply: string) => { await fetch("/api/marketplace/inquiries", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({id,reply,status:"replied"}) }); await fetchProfile(); };
  const handleSaveSettings  = async () => { setSettingsSaving(true); try { await fetch("/api/marketplace/profiles", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(settingsForm) }); await fetchProfile(); } finally { setSettingsSaving(false); } };

  const unreadCount = profile.inquiries.filter(i => i.status === "unread").length;
  const TABS = [
    { id: "listings",  label: "Listings",  count: profile.listings.length },
    { id: "inquiries", label: "Inquiries", count: unreadCount, dot: unreadCount > 0 },
    { id: "wallet",    label: "Wallet" },
    { id: "settings",  label: "Settings" },
  ] as const;

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4">

        {/* ── Profile header ── */}
        <div className="relative bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-6">
          <div className="relative h-24 sm:h-28 bg-gradient-to-br from-purple-950 to-gray-900">
            {profile.coverImage && (
              <img src={profile.coverImage} alt="" className="w-full h-full object-cover opacity-40" />
            )}
          </div>
          <div className="px-4 sm:px-6 pb-5 -mt-8 relative">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-4 border-gray-900 bg-gray-800 overflow-hidden mb-3 flex items-center justify-center shadow-xl">
              {profile.logoImage
                ? <img src={profile.logoImage} alt="" className="w-full h-full object-cover" />
                : <Store className="w-7 h-7 sm:w-8 sm:h-8 text-purple-400" />}
            </div>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-gray-100 font-black text-lg sm:text-xl truncate max-w-[200px] sm:max-w-none">
                    {profile.businessName}
                  </h1>
                  {profile.isVerified && <BadgeCheck className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 shrink-0" />}
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${profile.isActive ? "bg-green-900/40 text-green-400 border border-green-700/30" : "bg-red-900/40 text-red-400 border border-red-700/30"}`}>
                    {profile.isActive ? "Active" : "Paused"}
                  </span>
                </div>
                <p className="text-gray-500 text-xs sm:text-sm mt-0.5">{profile.category} · {profile.location}</p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-400 text-amber-400" />
                  <span className="text-gray-300 font-semibold text-xs sm:text-sm">
                    {profile.rating > 0 ? profile.rating.toFixed(1) : "—"}
                  </span>
                  <span className="text-gray-600 text-xs">({profile.reviewCount})</span>
                </div>
                <a href={`/marketplace/${profile.id}`} target="_blank"
                  className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition text-xs font-semibold">
                  Profile <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs — scrollable on mobile ── */}
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-6 overflow-x-auto scrollbar-hide">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                tab === t.id ? "bg-gray-800 text-gray-100 shadow" : "text-gray-500 hover:text-gray-300"
              }`}>
              {t.label}
              {"count" in t && t.count !== undefined && t.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${"dot" in t && t.dot ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-400"}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-900/30 border border-red-700/50 text-red-400 rounded-xl px-4 py-3 text-sm mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        {/* ── LISTINGS ── */}
        {tab === "listings" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-gray-200 font-bold text-sm sm:text-base">Your Listings</h2>
              {!showAdd && (
                <button onClick={() => setShowAdd(true)}
                  className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm transition">
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Add Listing
                </button>
              )}
            </div>

            {showAdd && (
              <ListingForm profileCategory={profile.category} saving={saving}
                onSave={handleAddListing} onCancel={() => setShowAdd(false)} />
            )}

            {profile.listings.length === 0 && !showAdd ? (
              <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-2xl">
                <Package className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 font-semibold mb-1">No listings yet</p>
                <p className="text-gray-600 text-sm mb-4">Add your first service or product listing</p>
                <button onClick={() => setShowAdd(true)}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition">
                  Add Listing
                </button>
              </div>
            ) : profile.listings.map(listing => (
              <div key={listing.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                {editId === listing.id ? (
                  <div className="p-4">
                    <ListingForm initial={listing} profileCategory={profile.category} saving={saving}
                      onSave={handleUpdateListing} onCancel={() => setEditId(null)} />
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="flex items-start gap-3">

                      {/* Thumbnail */}
                      {listing.images[0] && (
                        <img
                          src={listing.images[0]} alt={listing.title}
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover shrink-0 border border-gray-700"
                        />
                      )}

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        {/* Title + status badge + action menu */}
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <h3 className="text-gray-200 font-semibold text-sm truncate">{listing.title}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 hidden sm:inline-flex ${listing.isActive ? "bg-green-900/30 border-green-700/30 text-green-400" : "bg-gray-800 border-gray-700 text-gray-500"}`}>
                              {listing.isActive ? "Active" : "Paused"}
                            </span>
                          </div>

                          {/* Desktop action buttons */}
                          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleToggleListing(listing.id, !listing.isActive)}
                              className="p-1.5 rounded-lg border border-gray-700 text-gray-500 hover:text-gray-300 transition"
                              title={listing.isActive ? "Pause" : "Activate"}
                            >
                              {listing.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <EyeIcon className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => setEditId(listing.id)}
                              className="p-1.5 rounded-lg border border-gray-700 text-gray-500 hover:text-purple-400 hover:border-purple-700 transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteListing(listing.id)}
                              className="p-1.5 rounded-lg border border-gray-700 text-gray-500 hover:text-red-400 hover:border-red-700 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Mobile: three-dot menu */}
                          <div className="relative sm:hidden shrink-0">
                            <button
                              onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === listing.id ? null : listing.id); }}
                              className="p-1.5 rounded-lg border border-gray-700 text-gray-500 hover:text-gray-300 transition"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {openMenuId === listing.id && (
                              <div
                                className="absolute right-0 top-full mt-1 z-20 bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden min-w-[140px]"
                                onClick={e => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => { handleToggleListing(listing.id, !listing.isActive); setOpenMenuId(null); }}
                                  className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-gray-300 hover:bg-gray-800 transition"
                                >
                                  {listing.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <EyeIcon className="w-3.5 h-3.5" />}
                                  {listing.isActive ? "Pause" : "Activate"}
                                </button>
                                <button
                                  onClick={() => { setEditId(listing.id); setOpenMenuId(null); }}
                                  className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-gray-300 hover:bg-gray-800 transition"
                                >
                                  <Edit2 className="w-3.5 h-3.5" /> Edit
                                </button>
                                <button
                                  onClick={() => { handleDeleteListing(listing.id); setOpenMenuId(null); }}
                                  className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-red-400 hover:bg-gray-800 transition border-t border-gray-800"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Mobile status badge */}
                        <span className={`inline-flex text-xs px-2 py-0.5 rounded-full border mb-1.5 sm:hidden ${listing.isActive ? "bg-green-900/30 border-green-700/30 text-green-400" : "bg-gray-800 border-gray-700 text-gray-500"}`}>
                          {listing.isActive ? "Active" : "Paused"}
                        </span>

                        <p className="text-gray-500 text-xs line-clamp-2 mb-2">{listing.description}</p>

                        {/* Price + meta */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          <span className="text-purple-400 font-semibold">
                            {listing.priceType === "negotiable" ? "Negotiable"
                              : listing.priceType === "free" ? "Free"
                              : listing.price
                                ? `KES ${listing.price.toLocaleString()}${listing.priceType === "hourly" ? "/hr" : listing.priceType === "daily" ? "/day" : ""}`
                                : "—"}
                          </span>
                          <span className="text-gray-600">{listing.images.length} photo{listing.images.length !== 1 ? "s" : ""}</span>
                          {/* Tags — show max 2 on mobile, 3 on sm */}
                          {listing.tags.slice(0, 2).map(t => (
                            <span key={t} className="bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full sm:hidden">{t}</span>
                          ))}
                          {listing.tags.slice(0, 3).map(t => (
                            <span key={t} className="bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full hidden sm:inline-flex">{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── INQUIRIES ── */}
        {tab === "inquiries" && (
          <div className="space-y-3">
            <h2 className="text-gray-200 font-bold mb-4">Customer Inquiries</h2>
            {profile.inquiries.length === 0 ? (
              <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-2xl">
                <MessageSquare className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 font-semibold">No inquiries yet</p>
                <p className="text-gray-600 text-sm mt-1">Event organizers will contact you directly from your profile.</p>
              </div>
            ) : profile.inquiries.map(inq => (
              <InquiryRow key={inq.id} inquiry={inq} onReply={handleReply} />
            ))}
          </div>
        )}

        {/* ── WALLET ── */}
        {tab === "wallet" && <WalletTab />}

        {/* ── SETTINGS ── */}
        {tab === "settings" && (
          <SettingsTab
            settingsForm={settingsForm}
            setSettingsForm={setSettingsForm}
            onSave={handleSaveSettings}
            saving={settingsSaving}
          />
        )}
      </div>
    </div>
  );
}