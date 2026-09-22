"use client";

// /app/events/create/page.tsx
import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Ticket, Plus, Trash2, Upload, CheckCircle, Loader2, MapPin,
} from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import SignInModal from "@/components/SignInModal";

interface Category {
  id: string;
  name: string;
  icon?: string;
  iconColor?: string;
}

interface TicketEntry {
  name: string;
  price: string;
  capacity: number;
}

interface VenueSuggestion {
  place_name: string;
  place_type?: string[];
  center: [number, number];
}

type EventType = "rsvp" | "paid";
type SubmitStatus = "idle" | "loading" | "success" | "error";

const COUNTRIES = ["Kenya", "Tanzania", "Uganda"];

const INPUT =
  "w-full rounded-lg border border-gray-400/50 bg-white/5 px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed";

export default function CreateEvent() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [formData, setFormData] = useState({
    image: "",
    title: "",
    host: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    country: "",
    location: "",
    description: "",
    requireApproval: false,
    eventType: "rsvp" as EventType,
    capacity: 100,
    tickets: [] as TicketEntry[],
    lat: null as number | null,
    lng: null as number | null,
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<VenueSuggestion[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [manualLocation, setManualLocation] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [submitError, setSubmitError] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const blobUrlRef = useRef<string | null>(null);
  const [showSignInModal, setShowSignInModal] = useState(false);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      setShowSignInModal(true);
    }

    if (sessionStatus === "authenticated") {
      setShowSignInModal(false);
    }
  }, [sessionStatus]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/categories");
        if (!res.ok) return;
        const data: Category[] = await res.json();
        setCategories(data);
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    })();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (e.target instanceof HTMLInputElement && type === "checkbox") {
      setFormData((p) => ({ ...p, [name]: (e.target as HTMLInputElement).checked }));
    } else if (name === "capacity") {
      setFormData((p) => ({ ...p, [name]: Number(value) }));
    } else {
      setFormData((p) => ({ ...p, [name]: value }));
    }
  };

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    const localUrl = URL.createObjectURL(file);
    blobUrlRef.current = localUrl;
    setImagePreview(localUrl);
    setImageUploading(true);
    setSubmitError("");
    try {
      const compressed = await compressImage(file);
      const data = new FormData();
      data.append("file", new File([compressed], file.name, { type: "image/webp" }));
      const res = await fetch("/api/upload", { method: "POST", body: data });
      if (!res.ok) throw new Error("Upload failed");
      const result = await res.json();
      URL.revokeObjectURL(localUrl);
      blobUrlRef.current = null;
      setImagePreview(result.url);
      setFormData((p) => ({ ...p, image: result.url }));
    } catch {
      setSubmitError("Image upload failed. Please try again.");
      setFormData((p) => ({ ...p, image: "" }));
    } finally {
      setImageUploading(false);
    }
  };

  const handleVenueSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    setFormData(p => ({ ...p, location: q, lat: null, lng: null }));
    setSuggestions([]);
    if (q.length < 3 || !formData.country) return;
    setLocationLoading(true);
    try {
      const country = formData.country === "Kenya" ? "KE"
        : formData.country === "Tanzania" ? "TZ" : "UG";
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
        `?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}` +
        `&country=${country}&language=en&limit=5&types=poi,address,place`
      );
      const data = await res.json();
      setSuggestions(data.features ?? []);
    } catch { /* silent */ }
    finally { setLocationLoading(false); }
  };

  const selectVenue = (place: VenueSuggestion) => {
    const [lng, lat] = place.center;
    setFormData(p => ({ ...p, location: place.place_name, lat, lng }));
    setQuery(place.place_name);
    setSuggestions([]);
    setManualLocation(false);
  };

  const addTicket = () =>
    setFormData((p) => ({ ...p, tickets: [...p.tickets, { name: "", price: "", capacity: 50 }] }));
  const removeTicket = (i: number) =>
    setFormData((p) => ({ ...p, tickets: p.tickets.filter((_, idx) => idx !== i) }));
  const handleTicketChange = (i: number, field: keyof TicketEntry, value: string | number) =>
    setFormData((p) => { const t = [...p.tickets]; t[i] = { ...t[i], [field]: value }; return { ...p, tickets: t }; });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (sessionStatus !== "authenticated") {
      setShowSignInModal(true);
      return;
    }
    if (!manualLocation && !formData.lat && !formData.lng) {
      setSubmitError("Please select a venue from the suggestions, or enable manual entry below the search.");
      return;
    }
    if (formData.eventType === "paid" && formData.tickets.length === 0) {
      setSubmitError("Please add at least one ticket for a paid event.");
      return;
    }
    if (selectedCategoryIds.length === 0) {
      setSubmitError("Please select at least one category.");
      return;
    }
    if (imageUploading) { setSubmitError("Please wait for the image to finish uploading."); return; }
    if (!formData.image) { setSubmitError("Please upload an event image."); return; }
    setSubmitStatus("loading");
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          isRsvp: formData.eventType === "rsvp",
          categoryIds: selectedCategoryIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create event");
      setSubmitStatus("success");
      setTimeout(() => router.push(`/events/${data.event.id}`), 1500);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitStatus("error");
    }
  };

  if (sessionStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-purple-500" />
      </div>
    );
  }

  const isRsvp = formData.eventType === "rsvp";
  const isSubmitting = submitStatus === "loading";

  return (
    <div className="min-h-screen text-[var(--foreground)] flex justify-center py-4 px-4">
      <div className="flex flex-col lg:flex-row w-full max-w-5xl overflow-hidden border border-gray-400/20 bg-gray-900 rounded-2xl shadow-2xl">

        {/* ── Left: image upload ── */}
        <div className="lg:w-1/2 flex flex-col items-center justify-start p-6 sm:p-8 lg:p-10 lg:pr-8 border-b lg:border-b-0 lg:border-r border-[var(--brand-purple)]/25">
          <div className="w-full max-w-xl">
            {imagePreview ? (
              <div className="relative w-full">
                <img
                  src={imagePreview}
                  alt="Event preview"
                  className="w-full max-h-80 object-cover rounded-xl shadow-lg"
                />
                {imageUploading && (
                  <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                    <span className="text-white text-sm font-medium">Uploading...</span>
                  </div>
                )}
              </div>
            ) : (
              <label
                htmlFor="image-upload"
                className="flex flex-col items-center justify-center w-full h-72 border border-dashed border-[var(--brand-purple)]/40 rounded-xl cursor-pointer hover:border-purple-600 hover:bg-white/2 transition"
              >
                <Upload className="w-12 h-12 text-purple-500 mb-3" />
                <p className="text-[var(--foreground)] text-sm font-medium">Click to upload event image</p>
                <p className="text-[var(--muted)] text-xs mt-1">PNG, JPG, WEBP supported</p>
              </label>
            )}
            <input id="image-upload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            {imagePreview && (
              <button
                type="button"
                onClick={() => { setImagePreview(null); setFormData((p) => ({ ...p, image: "" })); }}
                className="mt-2 text-xs text-red-400 hover:text-red-300 transition"
              >
                Remove image
              </button>
            )}
          </div>
          {session?.user?.name && (
            <p className="mt-6 text-xs text-[var(--muted)] self-start">
              Creating as <span className="text-purple-500 font-semibold">{session.user.name}</span>
            </p>
          )}
        </div>

        {/* ── Right: form ── */}
        <form onSubmit={handleSubmit} className="lg:w-1/2 p-8 flex flex-col gap-5">

          {/* Title */}
          <input
            type="text" name="title" placeholder="Event Name *"
            value={formData.title} onChange={handleChange} required className={INPUT}
          />

          {/* Host */}
          <input
            type="text" name="host" placeholder="Hosted by *"
            value={formData.host} onChange={handleChange} required className={INPUT}
          />

          {/* Categories */}
          <div>
            <label className="block text-xs text-[var(--muted)] mb-2 font-medium">
              Event Categories *{" "}
              <span className="font-normal opacity-60">(select all that apply)</span>
            </label>
            {categories.length === 0 ? (
              <p className="text-xs text-[var(--muted)] italic">Loading categories...</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const selected = selectedCategoryIds.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition duration-300 ${selected
                        ? "bg-purple-600/20 border-purple-600 text-purple-400"
                        : "bg-white/5 border-gray-400/50 text-[var(--muted)] hover:border-purple-600 hover:text-[var(--foreground)]"
                        }`}
                    >
                      {selected && <CheckCircle className="w-3 h-3" />}
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            )}
            {selectedCategoryIds.length > 0 && (
              <p className="text-xs text-purple-500 mt-2">
                {selectedCategoryIds.length} categor{selectedCategoryIds.length === 1 ? "y" : "ies"} selected
              </p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1 font-medium">Start *</label>
              <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} required className={INPUT} />
              <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} required className={`mt-2 ${INPUT}`} />
            </div>
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1 font-medium">End</label>
              <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className={INPUT} />
              <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} className={`mt-2 ${INPUT}`} />
            </div>
          </div>

          {/* Venue */}
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1 font-medium">Event Venue *</label>
            <div className="space-y-2">
              <select
                name="country"
                value={formData.country}
                onChange={e => setFormData(p => ({ ...p, country: e.target.value, location: "", lat: null, lng: null }))}
                required
                className={INPUT}
              >
                <option value="">Select Country *</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <div className="relative">
                <input
                  type="text"
                  placeholder={formData.country ? "Search for a venue..." : "Select a country first"}
                  value={query}
                  onChange={handleVenueSearch}
                  disabled={!formData.country}
                  className={INPUT}
                />
                {suggestions.length > 0 && (
                  <ul className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-400/20 rounded-xl shadow-xl max-h-52 overflow-y-auto">
                    {suggestions.map((place, idx) => (
                      <li
                        key={idx}
                        onClick={() => selectVenue(place)}
                        className="px-4 py-3 text-sm text-[var(--foreground)] hover:bg-white/5 cursor-pointer border-b border-gray-400/20 last:border-none transition"
                      >
                        <p className="font-medium truncate">{place.place_name}</p>
                        <p className="text-xs text-[var(--muted)] mt-0.5">{place.place_type?.[0]}</p>
                      </li>
                    ))}
                  </ul>
                )}
                {locationLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-[var(--muted)]" />
                  </div>
                )}
              </div>

              {formData.lat && formData.lng && (
                <p className="text-xs text-[var(--brand-green)] flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Coordinates captured: {formData.lat.toFixed(4)}, {formData.lng.toFixed(4)}
                </p>
              )}

              {formData.lat && formData.lng && (
                <VenueMap
                  lat={formData.lat}
                  lng={formData.lng}
                  onMove={(lat, lng) => setFormData(p => ({ ...p, lat, lng }))}
                />
              )}

              {!formData.lat && formData.country && query.length > 2 && suggestions.length === 0 && !locationLoading && (
                <button
                  type="button"
                  onClick={() => { setFormData(p => ({ ...p, location: query })); setManualLocation(true); }}
                  className="text-xs text-[var(--muted)] hover:text-purple-500 transition text-left"
                >
                  Venue not found? Save name as-is →
                </button>
              )}

              {manualLocation && (
                <p className="text-xs text-purple-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Saved as custom venue — no map pin will be shown.
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1 font-medium">Description</label>
            <textarea
              name="description"
              placeholder="Tell people what to expect at your event..."
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className={`${INPUT} resize-none`}
            />
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-xs text-[var(--muted)] mb-2 font-medium">Event Type *</label>
            <div className="grid grid-cols-2 gap-3">
              {(["rsvp", "paid"] as EventType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, eventType: type, tickets: type === "rsvp" ? [] : p.tickets }))}
                  className={`py-3 rounded-lg border text-sm font-semibold transition-all ${formData.eventType === type
                    ? "border-purple-600 bg-purple-600/20 text-purple-400"
                    : "border-gray-400/50 bg-white/5 text-[var(--muted)] hover:border-purple-600 hover:text-[var(--foreground)]"
                    }`}
                >
                  {type === "rsvp" ? "RSVP" : "Paid Tickets"}
                </button>
              ))}
            </div>
          </div>

          {/* RSVP settings */}
          {isRsvp && (
            <div className="bg-white/2 border border-[var(--brand-purple)]/25 rounded-xl p-4 space-y-3">
              <p className="text-sm text-purple-500 font-medium">RSVP Settings</p>
              <div>
                <label className="block text-xs text-[var(--muted)] mb-1">Total Capacity *</label>
                <input
                  type="number" name="capacity" min={1}
                  value={formData.capacity} onChange={handleChange}
                  required placeholder="Max attendees" className={INPUT}
                />
                <p className="text-xs text-[var(--muted)] mt-1">Attendees will RSVP for free. Set 0 for unlimited.</p>
              </div>
            </div>
          )}

          {/* Paid tickets */}
          {!isRsvp && (
            <div className="bg-white/2 border border-[var(--brand-purple)]/25 rounded-xl p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="flex items-center gap-2 text-sm text-purple-500 font-medium">
                  <Ticket className="h-4 w-4" /> Ticket Types
                </span>
                <button
                  type="button"
                  onClick={addTicket}
                  className="flex items-center gap-1 text-sm text-purple-500 hover:opacity-80 font-medium transition"
                >
                  <Plus className="h-4 w-4" /> Add Ticket
                </button>
              </div>
              {formData.tickets.length === 0 && (
                <p className="text-xs text-[var(--muted)] italic text-center py-3">
                  No tickets yet. Click &quot;Add Ticket&quot; to get started.
                </p>
              )}
              <div className="space-y-3">
                {formData.tickets.map((ticket, index) => (
                  <div
                    key={index}
                    className="flex gap-2 items-end bg-white/2 border border-gray-400/20 p-3 rounded-xl flex-wrap"
                  >
                    <div className="flex flex-col flex-1 min-w-[100px]">
                      <label className="text-xs text-[var(--muted)] pb-1">Ticket Name</label>
                      <input
                        type="text"
                        placeholder="e.g. VIP, General"
                        value={ticket.name}
                        onChange={(e) => handleTicketChange(index, "name", e.target.value)}
                        className={INPUT}
                      />
                    </div>
                    <div className="flex flex-col w-24">
                      <label className="text-xs text-[var(--muted)] pb-1">Price (KES)</label>
                      <input
                        type="text"
                        placeholder="1500"
                        value={ticket.price}
                        onChange={(e) => handleTicketChange(index, "price", e.target.value)}
                        className={INPUT}
                      />
                    </div>
                    <div className="flex flex-col w-24">
                      <label className="text-xs text-[var(--muted)] pb-1">Quantity</label>
                      <input
                        type="number"
                        min={1}
                        placeholder="50"
                        value={ticket.capacity}
                        onChange={(e) => handleTicketChange(index, "capacity", Number(e.target.value))}
                        className={INPUT}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTicket(index)}
                      className="text-red-400 hover:text-red-300 transition pb-1"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Require Approval toggle */}
          <label className="flex justify-between items-center cursor-pointer select-none">
            <div>
              <span className="text-[var(--foreground)] text-sm font-medium">Require Approval</span>
              <p className="text-xs text-[var(--muted)]">You manually approve each attendee</p>
            </div>
            <div
              onClick={() => setFormData((p) => ({ ...p, requireApproval: !p.requireApproval }))}
              className={`w-12 h-6 rounded-full transition-colors cursor-pointer flex items-center px-0.5 ${formData.requireApproval ? "bg-purple-600" : "bg-gray-700"
                }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${formData.requireApproval ? "translate-x-6" : "translate-x-0"
                }`} />
            </div>
          </label>

          {/* Error */}
          {submitError && (
            <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-3 text-sm text-red-400">
              {submitError}
            </div>
          )}

          {/* Success */}
          {submitStatus === "success" && (
            <div className="bg-green-900/20 border border-green-800/50 rounded-xl p-3 text-sm text-green-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Event created! Redirecting...
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || submitStatus === "success"}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition duration-300 flex items-center justify-center gap-2 text-sm"
          >
            {isSubmitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating Event...</>
              : "Create Event"
            }
          </button>
        </form>
      </div>

      {
        showSignInModal && (
          <SignInModal onClose={() => setShowSignInModal(false)} />
        )
      }</div>
  );
}

function VenueMap({ lat, lng, onMove }: { lat: number; lng: number; onMove: (lat: number, lng: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [lng, lat],
      zoom: 15,
      scrollZoom: false,
    });
    const marker = new mapboxgl.Marker({ draggable: true, color: "#9333ea" })
      .setLngLat([lng, lat])
      .addTo(map);
    marker.on("dragend", () => {
      const { lat: newLat, lng: newLng } = marker.getLngLat();
      onMove(newLat, newLng);
    });
    return () => { map.remove(); };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-48 rounded-xl overflow-hidden border border-gray-400/20 mt-1"
    />
  );
}