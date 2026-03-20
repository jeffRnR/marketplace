"use client";
// app/marketplace/dashboard/page.tsx

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Store, Plus, Edit2, Trash2, Eye, EyeOff, MessageSquare,
  Star, Package, ChevronDown, ChevronUp, Loader2, BadgeCheck,
  Phone, Save, AlertCircle, Upload, X, ImageIcon,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Listing {
  id: string; title: string; description: string; category: string;
  priceType: string; price: number | null; currency: string;
  images: string[]; tags: string[]; isActive: boolean; createdAt: string;
}
interface Inquiry {
  id: string; senderName: string; senderEmail: string; senderPhone: string | null;
  message: string; status: string; reply: string | null; createdAt: string;
  listing: { id: string; title: string } | null;
}
interface Profile {
  id: string; businessName: string; tagline: string | null;
  description: string; category: string; location: string;
  phone: string; email: string; website: string | null;
  instagram: string | null; coverImage: string | null; logoImage: string | null;
  isVerified: boolean; isActive: boolean; rating: number; reviewCount: number;
  listings: Listing[]; inquiries: Inquiry[];
}

const PRICE_TYPES = ["fixed", "hourly", "daily", "negotiable", "free"];
const LISTING_CATEGORIES = [
  "Venue","Sound & Lighting","Catering","Bar & Alcohol","DJ Services",
  "Live Music","Photography","Staffing & HR","Decor & Florals",
  "Entertainment","Transport","Logistics","Security","Tech & AV",
  "Print & Branding","Merchandise","Other",
];
const STATUS_STYLES: Record<string, string> = {
  unread:  "bg-purple-900/30 border-purple-700/50 text-purple-400",
  read:    "bg-gray-800 border-gray-700 text-gray-500",
  replied: "bg-green-900/30 border-green-700/50 text-green-400",
};

// ─── Image compression (same as event form) ───────────────────────────────────

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX = 1200;
      let { width, height } = img;
      if (width > MAX) { height = (height * MAX) / width; width = MAX; }
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => resolve(blob!), "image/webp", 0.8);
    };
    img.src = url;
  });
}

// ─── Single image upload button (for profile cover/logo) ─────────────────────

function SingleImageUpload({
  value, onChange, label, folder, aspectClass = "aspect-video",
}: {
  value: string; onChange: (url: string) => void;
  label: string; folder: string; aspectClass?: string;
}) {
  const inputRef   = useRef<HTMLInputElement>(null);
  const blobRef    = useRef<string | null>(null);
  const [preview,  setPreview]  = useState(value);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    const local = URL.createObjectURL(file);
    blobRef.current = local;
    setPreview(local);
    setLoading(true); setError("");
    try {
      const compressed = await compressImage(file);
      const fd = new FormData();
      fd.append("file", new File([compressed], file.name, { type: "image/webp" }));
      fd.append("folder", folder);
      const res  = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      URL.revokeObjectURL(local);
      blobRef.current = null;
      setPreview(data.url);
      onChange(data.url);
    } catch {
      setError("Upload failed. Try again.");
      setPreview(value);
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-gray-400 text-xs font-semibold">{label}</label>
      <div
        className={`relative w-full ${aspectClass} rounded-xl overflow-hidden border border-gray-700 bg-gray-800 cursor-pointer hover:border-purple-600 transition`}
        onClick={() => inputRef.current?.click()}
      >
        {preview ? (
          <img src={preview} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500">
            <ImageIcon className="w-8 h-8" />
            <p className="text-xs">Click to upload</p>
          </div>
        )}
        {loading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-white" />
            <span className="text-white text-xs">Uploading…</span>
          </div>
        )}
        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1 text-white text-xs">
          <Upload className="w-3 h-3" /> Change
        </div>
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
    </div>
  );
}

// ─── Multi-image upload (for listing images) ──────────────────────────────────

function MultiImageUpload({
  images, onChange, folder, max = 5,
}: {
  images: string[]; onChange: (urls: string[]) => void; folder: string; max?: number;
}) {
  const inputRef    = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState("");

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const remaining = max - images.length;
    if (remaining <= 0) { setError(`Maximum ${max} images allowed.`); return; }
    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true); setError("");
    try {
      const urls = await Promise.all(toUpload.map(async (file) => {
        const compressed = await compressImage(file);
        const fd = new FormData();
        fd.append("file", new File([compressed], file.name, { type: "image/webp" }));
        fd.append("folder", folder);
        const res  = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) throw new Error("Upload failed");
        return (await res.json()).url as string;
      }));
      onChange([...images, ...urls]);
    } catch {
      setError("One or more uploads failed. Try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeImage = (i: number) => onChange(images.filter((_, idx) => idx !== i));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-gray-400 text-xs font-semibold">
          Listing Images <span className="text-gray-600">({images.length}/{max})</span>
        </label>
        {images.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 font-semibold transition disabled:opacity-40"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {uploading ? "Uploading…" : "Add photos"}
          </button>
        )}
      </div>

      {/* Preview grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((url, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-gray-700 bg-gray-800 group">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white"
              >
                <X className="w-3 h-3" />
              </button>
              {i === 0 && (
                <span className="absolute bottom-1 left-1 text-[10px] bg-black/70 text-white px-1.5 py-0.5 rounded-md">Cover</span>
              )}
            </div>
          ))}
          {/* Add more slot */}
          {images.length < max && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-gray-700 hover:border-purple-600 flex items-center justify-center text-gray-600 hover:text-purple-400 transition"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {images.length === 0 && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full h-28 rounded-xl border-2 border-dashed border-gray-700 hover:border-purple-600 flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-purple-400 transition"
        >
          <Upload className="w-6 h-6" />
          <p className="text-xs">Click to upload photos</p>
          <p className="text-gray-700 text-xs">PNG, JPG, WEBP · max {max} photos</p>
        </button>
      )}

      {error && <p className="text-red-400 text-xs">{error}</p>}
      <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
    </div>
  );
}

// ─── Listing Form ─────────────────────────────────────────────────────────────

function ListingForm({ initial, profileCategory, onSave, onCancel, saving }: {
  initial?: Partial<Listing>; profileCategory: string;
  onSave: (d: any) => void; onCancel: () => void; saving: boolean;
}) {
  const [form, setForm] = useState({
    title:       initial?.title       ?? "",
    description: initial?.description ?? "",
    category:    initial?.category    ?? profileCategory,
    priceType:   initial?.priceType   ?? "fixed",
    price:       initial?.price?.toString() ?? "",
    images:      initial?.images ?? [] as string[],
    tags:        initial?.tags?.join(", ") ?? "",
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-400 text-xs mb-1.5">Title *</label>
          <input value={form.title} onChange={e => set("title", e.target.value)}
            placeholder="e.g. Wedding Photography Package"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-gray-200 text-sm focus:outline-none focus:border-purple-600" />
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-1.5">Category</label>
          <select value={form.category} onChange={e => set("category", e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-gray-200 text-sm focus:outline-none focus:border-purple-600">
            {LISTING_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-gray-400 text-xs mb-1.5">Description *</label>
        <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-gray-200 text-sm focus:outline-none focus:border-purple-600 resize-none" />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-400 text-xs mb-1.5">Price Type</label>
          <select value={form.priceType} onChange={e => set("priceType", e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-gray-200 text-sm focus:outline-none focus:border-purple-600">
            {PRICE_TYPES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
          </select>
        </div>
        {!["negotiable","free"].includes(form.priceType) && (
          <div>
            <label className="block text-gray-400 text-xs mb-1.5">Price (KES)</label>
            <input type="number" value={form.price} onChange={e => set("price", e.target.value)} placeholder="0"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-gray-200 text-sm focus:outline-none focus:border-purple-600" />
          </div>
        )}
      </div>

      {/* ── Photo upload ── */}
      <MultiImageUpload
        images={form.images}
        onChange={urls => set("images", urls)}
        folder="listings"
        max={5}
      />

      <div>
        <label className="block text-gray-400 text-xs mb-1.5">Tags <span className="text-gray-600">(comma-separated)</span></label>
        <input value={form.tags} onChange={e => set("tags", e.target.value)}
          placeholder="wedding, outdoor, buffet…"
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-gray-200 text-sm focus:outline-none focus:border-purple-600" />
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={() => onSave({
          ...form,
          price:  form.price ? Number(form.price) : null,
          tags:   form.tags.split(",").map(s => s.trim()).filter(Boolean),
          ...(initial?.id ? { id: initial.id } : {}),
        })} disabled={saving || !form.title.trim() || !form.description.trim()}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {initial?.id ? "Update" : "Add Listing"}
        </button>
        <button onClick={onCancel} className="px-4 py-2.5 border border-gray-700 text-gray-400 rounded-lg text-sm hover:border-gray-600 transition">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Inquiry Row ──────────────────────────────────────────────────────────────

function InquiryRow({ inquiry, onReply }: { inquiry: Inquiry; onReply: (id: string, reply: string) => void }) {
  const [open,   setOpen]   = useState(false);
  const [reply,  setReply]  = useState(inquiry.reply ?? "");
  const [saving, setSaving] = useState(false);
  const handleReply = async () => { setSaving(true); await onReply(inquiry.id, reply); setSaving(false); };

  return (
    <div className={`border rounded-xl overflow-hidden ${open ? "border-purple-700/40" : "border-gray-800"}`}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-800/40 transition">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-2 h-2 rounded-full shrink-0 ${inquiry.status==="unread"?"bg-purple-400":inquiry.status==="replied"?"bg-green-400":"bg-gray-600"}`} />
          <div className="min-w-0">
            <p className="text-gray-200 text-sm font-semibold truncate">{inquiry.senderName}</p>
            <p className="text-gray-500 text-xs truncate">{inquiry.senderEmail}{inquiry.listing && ` · re: ${inquiry.listing.title}`}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_STYLES[inquiry.status]??""}`}>{inquiry.status}</span>
          {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-gray-800 pt-4 space-y-4">
          {inquiry.senderPhone && <p className="text-gray-500 text-xs flex items-center gap-1"><Phone className="w-3 h-3"/>{inquiry.senderPhone}</p>}
          <div className="bg-gray-800 rounded-xl p-3"><p className="text-gray-300 text-sm">{inquiry.message}</p></div>
          {inquiry.reply && (
            <div className="bg-purple-900/20 border border-purple-700/30 rounded-xl p-3">
              <p className="text-purple-400 text-xs font-semibold mb-1">Your reply</p>
              <p className="text-gray-300 text-sm">{inquiry.reply}</p>
            </div>
          )}
          <div>
            <textarea value={reply} onChange={e => setReply(e.target.value)} rows={2} placeholder="Reply to this inquiry…"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-purple-600 resize-none mb-2" />
            <button onClick={handleReply} disabled={saving || !reply.trim()}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-semibold px-4 py-2 rounded-lg text-sm transition">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
              Send Reply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [profile,        setProfile]        = useState<Profile | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [tab,            setTab]            = useState<"listings"|"inquiries"|"settings">("listings");
  const [showAdd,        setShowAdd]        = useState(false);
  const [editId,         setEditId]         = useState<string | null>(null);
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState("");
  const [settingsForm,   setSettingsForm]   = useState<any>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);

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
          website:      data.website       ?? "",      instagram: data.instagram ?? "",
          coverImage:   data.coverImage    ?? "",      logoImage: data.logoImage  ?? "",
          isActive:     data.isActive,
        });
      } else {
        router.push("/marketplace/create-profile");
      }
    } finally { setLoading(false); }
  }, [router]);

  useEffect(() => { if (session?.user) fetchProfile(); }, [session, fetchProfile]);

  if (!session?.user) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Sign in to access your dashboard</p></div>;
  if (loading)        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-purple-400 animate-spin" /></div>;
  if (!profile)       return null;

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
    { id: "settings",  label: "Settings" },
  ] as const;

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4">

        {/* Profile header */}
        <div className="relative bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-6">
          <div className="relative h-28 bg-gradient-to-br from-purple-950 to-gray-900">
            {profile.coverImage && <img src={profile.coverImage} alt="" className="w-full h-full object-cover opacity-40" />}
          </div>
          <div className="px-6 pb-5 -mt-8 relative">
            <div className="w-16 h-16 rounded-xl border-4 border-gray-900 bg-gray-800 overflow-hidden mb-3 flex items-center justify-center shadow-xl">
              {profile.logoImage ? <img src={profile.logoImage} alt="" className="w-full h-full object-cover" /> : <Store className="w-8 h-8 text-purple-400" />}
            </div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-gray-100 font-black text-xl">{profile.businessName}</h1>
                  {profile.isVerified && <BadgeCheck className="w-5 h-5 text-purple-400" />}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${profile.isActive?"bg-green-900/40 text-green-400 border border-green-700/30":"bg-red-900/40 text-red-400 border border-red-700/30"}`}>
                    {profile.isActive ? "Active" : "Paused"}
                  </span>
                </div>
                <p className="text-gray-500 text-sm">{profile.category} · {profile.location}</p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="text-gray-300 font-semibold">{profile.rating > 0 ? profile.rating.toFixed(1) : "—"}</span>
                  <span className="text-gray-600">({profile.reviewCount})</span>
                </div>
                <a href={`/marketplace/${profile.id}`} target="_blank" className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition text-xs font-semibold">
                  Public profile <Eye className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-6 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${tab===t.id?"bg-gray-800 text-gray-100 shadow":"text-gray-500 hover:text-gray-300"}`}>
              {t.label}
              {"count" in t && t.count !== undefined && t.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${"dot" in t && t.dot?"bg-purple-600 text-white":"bg-gray-700 text-gray-400"}`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {error && <div className="flex items-center gap-2 bg-red-900/30 border border-red-700/50 text-red-400 rounded-xl px-4 py-3 text-sm mb-4"><AlertCircle className="w-4 h-4 shrink-0"/>{error}</div>}

        {/* ── LISTINGS ── */}
        {tab === "listings" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-gray-200 font-bold">Your Listings</h2>
              {!showAdd && (
                <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold px-4 py-2 rounded-xl text-sm transition">
                  <Plus className="w-4 h-4"/>Add Listing
                </button>
              )}
            </div>
            {showAdd && <ListingForm profileCategory={profile.category} saving={saving} onSave={handleAddListing} onCancel={() => setShowAdd(false)} />}
            {profile.listings.length === 0 && !showAdd ? (
              <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-2xl">
                <Package className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 font-semibold mb-1">No listings yet</p>
                <p className="text-gray-600 text-sm mb-4">Add your first service or product listing</p>
                <button onClick={() => setShowAdd(true)} className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition">Add Listing</button>
              </div>
            ) : profile.listings.map(listing => (
              <div key={listing.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                {editId === listing.id ? (
                  <div className="p-4">
                    <ListingForm initial={listing} profileCategory={profile.category} saving={saving} onSave={handleUpdateListing} onCancel={() => setEditId(null)} />
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Thumbnail */}
                      {listing.images[0] && (
                        <img src={listing.images[0]} alt={listing.title} className="w-16 h-16 rounded-xl object-cover shrink-0 border border-gray-700" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-gray-200 font-semibold truncate">{listing.title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${listing.isActive?"bg-green-900/30 border-green-700/30 text-green-400":"bg-gray-800 border-gray-700 text-gray-500"}`}>
                            {listing.isActive ? "Active" : "Paused"}
                          </span>
                        </div>
                        <p className="text-gray-500 text-sm line-clamp-2 mb-2">{listing.description}</p>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-purple-400 font-semibold">
                            {listing.priceType==="negotiable"?"Negotiable":listing.priceType==="free"?"Free":listing.price?`KES ${listing.price.toLocaleString()}${listing.priceType==="hourly"?"/hr":listing.priceType==="daily"?"/day":""}`:"—"}
                          </span>
                          <span className="text-gray-600">{listing.images.length} photo{listing.images.length !== 1 ? "s" : ""}</span>
                          {listing.tags.slice(0,3).map(t => <span key={t} className="bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">{t}</span>)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => handleToggleListing(listing.id, !listing.isActive)} className="p-2 rounded-lg border border-gray-700 text-gray-500 hover:text-gray-300 transition" title={listing.isActive?"Pause":"Activate"}>
                          {listing.isActive ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                        </button>
                        <button onClick={() => setEditId(listing.id)} className="p-2 rounded-lg border border-gray-700 text-gray-500 hover:text-purple-400 hover:border-purple-700 transition"><Edit2 className="w-4 h-4"/></button>
                        <button onClick={() => handleDeleteListing(listing.id)} className="p-2 rounded-lg border border-gray-700 text-gray-500 hover:text-red-400 hover:border-red-700 transition"><Trash2 className="w-4 h-4"/></button>
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
            ) : profile.inquiries.map(inq => <InquiryRow key={inq.id} inquiry={inq} onReply={handleReply} />)}
          </div>
        )}

        {/* ── SETTINGS ── */}
        {tab === "settings" && settingsForm && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-6">
            <h2 className="text-gray-200 font-bold">Profile Settings</h2>

            {/* Cover + Logo image uploads */}
            <div className="grid sm:grid-cols-2 gap-4">
              <SingleImageUpload
                value={settingsForm.coverImage}
                onChange={url => setSettingsForm((f: any) => ({ ...f, coverImage: url }))}
                label="Cover Image"
                folder="marketplace/covers"
                aspectClass="aspect-video"
              />
              <SingleImageUpload
                value={settingsForm.logoImage}
                onChange={url => setSettingsForm((f: any) => ({ ...f, logoImage: url }))}
                label="Logo / Profile Photo"
                folder="marketplace/logos"
                aspectClass="aspect-square"
              />
            </div>

            {/* Text fields */}
            {(["businessName","tagline","location","phone","email","website","instagram"] as const).map(key => (
              <div key={key}>
                <label className="block text-gray-400 text-sm mb-1.5 capitalize">
                  {key.replace(/([A-Z])/g," $1").trim()}
                  {key==="businessName" && <span className="text-red-400"> *</span>}
                </label>
                <input
                  value={settingsForm[key]}
                  onChange={e => setSettingsForm((f: any) => ({ ...f, [key]: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-200 text-sm focus:outline-none focus:border-purple-600"
                />
              </div>
            ))}

            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Description</label>
              <textarea
                value={settingsForm.description}
                onChange={e => setSettingsForm((f: any) => ({ ...f, description: e.target.value }))}
                rows={4}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-200 text-sm focus:outline-none focus:border-purple-600 resize-none"
              />
            </div>

            <div className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
              <div>
                <p className="text-gray-300 text-sm font-semibold">Profile Active</p>
                <p className="text-gray-500 text-xs">When paused, your profile won't appear in search results</p>
              </div>
              <button
                onClick={() => setSettingsForm((f: any) => ({ ...f, isActive: !f.isActive }))}
                className={`relative w-12 h-6 rounded-full transition-all ${settingsForm.isActive ? "bg-purple-600" : "bg-gray-700"}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${settingsForm.isActive ? "left-7" : "left-1"}`} />
              </button>
            </div>

            <button onClick={handleSaveSettings} disabled={settingsSaving}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold px-6 py-3 rounded-xl transition text-sm w-full justify-center">
              {settingsSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}