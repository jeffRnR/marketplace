"use client";

// /app/events/create/page.tsx
import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Ticket, Plus, Trash2, Upload, CheckCircle, Loader2, MapPin, X,
} from "lucide-react";

interface Category {
  id: number;
  name: string;
  icon?: string;
  iconColor?: string;
}

interface TicketEntry {
  name: string;
  price: string;
  capacity: number;
}

type EventType   = "rsvp" | "paid";
type SubmitStatus = "idle" | "loading" | "success" | "error";

const COUNTRIES = ["Kenya", "Tanzania", "Uganda"];

const INPUT = "bg-gray-300 w-full rounded-lg border border-purple-800 p-3 text-gray-800 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-800/50 transition placeholder-gray-500";

export default function CreateEvent() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  // ── Form state ──
  const [formData, setFormData] = useState({
    image:           "",
    title:           "",
    host:            "",
    startDate:       "",
    startTime:       "",
    endDate:         "",
    endTime:         "",
    country:         "",
    location:        "",
    description:     "",
    requireApproval: false,
    eventType:       "rsvp" as EventType,
    capacity:        100,
    tickets:         [] as TicketEntry[],
    lat:             null as number | null,
    lng:             null as number | null,
  });

  // ── Multi-category state ──
  const [categories,         setCategories]         = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);

  // ── Location state ──
  const [query,           setQuery]           = useState("");
  const [suggestions,     setSuggestions]     = useState<any[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [manualLocation,  setManualLocation]  = useState(false); // free-text fallback

  // ── UI state ──
  const [submitStatus,  setSubmitStatus]  = useState<SubmitStatus>("idle");
  const [submitError,   setSubmitError]   = useState("");
  const [imagePreview,  setImagePreview]  = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") router.push("/login");
  }, [sessionStatus, router]);

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

  // ── Helpers ──
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

  const toggleCategory = (id: number) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  // ── Image upload ──
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

  // ── Venue search ──
  const handleVenueSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    setFormData((p) => ({ ...p, location: q, lat: null, lng: null }));
    if (q.length > 2 && formData.country) {
      setLocationLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(`${q}, ${formData.country}`)}&addressdetails=1&limit=5`
        );
        setSuggestions(await res.json());
      } catch { /* silent */ }
      finally { setLocationLoading(false); }
    } else {
      setSuggestions([]);
    }
  };

  const selectVenue = (place: any) => {
    setFormData((p) => ({
      ...p,
      location: place.display_name,
      lat: parseFloat(place.lat),
      lng: parseFloat(place.lon),
    }));
    setQuery(place.display_name);
    setSuggestions([]);
  };

  // ── Tickets ──
  const addTicket    = () => setFormData((p) => ({ ...p, tickets: [...p.tickets, { name: "", price: "", capacity: 50 }] }));
  const removeTicket = (i: number) => setFormData((p) => ({ ...p, tickets: p.tickets.filter((_, idx) => idx !== i) }));
  const handleTicketChange = (i: number, field: keyof TicketEntry, value: string | number) =>
    setFormData((p) => { const t = [...p.tickets]; t[i] = { ...t[i], [field]: value }; return { ...p, tickets: t }; });

  // ── Submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    // Location validation — allow manual entry without coords
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
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          isRsvp:      formData.eventType === "rsvp",
          categoryIds: selectedCategoryIds, // array of ids
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create event");
      setSubmitStatus("success");
      setTimeout(() => router.push(`/events/${data.event.id}`), 1500);
    } catch (err: any) {
      setSubmitError(err.message ?? "Something went wrong. Please try again.");
      setSubmitStatus("error");
    }
  };

  if (sessionStatus === "loading") {
    return <div className="min-h-screen flex items-center justify-center text-gray-400"><Loader2 className="animate-spin w-8 h-8" /></div>;
  }

  const isRsvp      = formData.eventType === "rsvp";
  const isSubmitting = submitStatus === "loading";

  return (
    <div className="min-h-screen mt-10 text-gray-200 flex justify-center py-10 px-4">
      <div className="flex flex-col lg:flex-row w-full max-w-5xl overflow-hidden">

        {/* ── Left: image upload ── */}
        <div className="lg:w-1/2 flex flex-col items-center justify-start pt-8 pr-0 lg:pr-8">
          <div className="w-full">
            {imagePreview ? (
              <div className="relative w-full">
                <img src={imagePreview} alt="Event preview" className="w-full max-h-80 object-cover rounded-xl shadow-lg" />
                {imageUploading && (
                  <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                    <span className="text-white text-sm">Uploading...</span>
                  </div>
                )}
              </div>
            ) : (
              <label htmlFor="image-upload" className="flex flex-col items-center justify-center w-full h-72 border-2 border-dashed border-purple-700 rounded-xl cursor-pointer hover:border-purple-500 transition-colors">
                <Upload className="w-12 h-12 text-purple-500 mb-3" />
                <p className="text-gray-400 text-sm font-medium">Click to upload event image</p>
                <p className="text-gray-600 text-xs mt-1">PNG, JPG, WEBP supported</p>
              </label>
            )}
            <input id="image-upload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            {imagePreview && (
              <button type="button" onClick={() => { setImagePreview(null); setFormData((p) => ({ ...p, image: "" })); }}
                className="mt-2 text-xs text-red-400 hover:text-red-300 transition">
                Remove image
              </button>
            )}
          </div>
          {session?.user?.name && (
            <p className="mt-6 text-xs text-gray-500 self-start">
              Creating as <span className="text-purple-400 font-semibold">{session.user.name}</span>
            </p>
          )}
        </div>

        {/* ── Right: form ── */}
        <form onSubmit={handleSubmit} className="lg:w-1/2 p-8 flex flex-col gap-5">

          {/* Title */}
          <input type="text" name="title" placeholder="Event Name *" value={formData.title}
            onChange={handleChange} required className={INPUT} />

          {/* Host */}
          <input type="text" name="host" placeholder="Hosted by *" value={formData.host}
            onChange={handleChange} required className={INPUT} />

          {/* ── Multi-category selector ── */}
          <div>
            <label className="block text-xs text-gray-400 mb-2 font-medium">
              Event Categories * <span className="text-gray-600 font-normal">(select all that apply)</span>
            </label>
            {categories.length === 0 ? (
              <p className="text-xs text-gray-500 italic">Loading categories...</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const selected = selectedCategoryIds.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition duration-300 ${
                        selected
                          ? "bg-purple-900/50 border-purple-500 text-purple-300"
                          : "bg-gray-800/40 border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200"
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
              <p className="text-xs text-purple-400 mt-2">
                {selectedCategoryIds.length} categor{selectedCategoryIds.length === 1 ? "y" : "ies"} selected
              </p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1 font-medium">Start *</label>
              <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} required className={INPUT} />
              <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} required className={`mt-2 ${INPUT}`} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1 font-medium">End</label>
              <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className={INPUT} />
              <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} className={`mt-2 ${INPUT}`} />
            </div>
          </div>

          {/* ── Venue ── */}
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-medium">Event Venue *</label>
            <div className="relative space-y-2">

              {/* Country selector */}
              <select name="country" value={formData.country} onChange={(e) =>
                setFormData((p) => ({ ...p, country: e.target.value, location: "", lat: null, lng: null }))}
                required className={INPUT}>
                <option value="">Select Country *</option>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>

              {/* Search or manual toggle */}
              {!manualLocation ? (
                <>
                  <input
                    type="text"
                    placeholder={formData.country ? "Search for a venue..." : "Select a country first"}
                    value={query}
                    onChange={handleVenueSearch}
                    disabled={!formData.country}
                    className={`${INPUT} disabled:opacity-50 disabled:cursor-not-allowed`}
                  />

                  {/* Suggestions dropdown */}
                  {query.length > 2 && (
                    <ul className="absolute z-50 bg-gray-900 border border-gray-700 rounded-lg mt-1 w-full shadow-xl max-h-48 overflow-y-auto">
                      {locationLoading ? (
                        <li className="p-3 text-sm text-gray-400 flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Searching...
                        </li>
                      ) : suggestions.length > 0 ? (
                        <>
                          {suggestions.map((place, idx) => (
                            <li key={idx} onClick={() => selectVenue(place)}
                              className="p-3 text-sm text-gray-300 hover:bg-gray-700 cursor-pointer transition-colors border-b border-gray-800 last:border-none">
                              {place.display_name}
                            </li>
                          ))}
                          {/* Manual entry option at bottom of dropdown */}
                          <li
                            onClick={() => { setManualLocation(true); setSuggestions([]); setFormData((p) => ({ ...p, location: query })); }}
                            className="p-3 text-sm text-purple-400 hover:bg-gray-700 cursor-pointer transition-colors flex items-center gap-2 border-t border-gray-700"
                          >
                            <MapPin className="w-3.5 h-3.5" /> Use "{query}" as-is (venue not on map)
                          </li>
                        </>
                      ) : (
                        <li className="p-3 text-sm text-gray-500 italic flex flex-col gap-2">
                          <span>No results found.</span>
                          <button
                            type="button"
                            onClick={() => { setManualLocation(true); setSuggestions([]); setFormData((p) => ({ ...p, location: query })); }}
                            className="text-purple-400 hover:text-purple-300 text-left text-xs transition"
                          >
                            → Use "{query}" as a custom venue instead
                          </button>
                        </li>
                      )}
                    </ul>
                  )}

                  {/* Coordinates confirmed */}
                  {formData.lat && formData.lng && (
                    <p className="text-xs text-green-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Coordinates captured: {formData.lat.toFixed(4)}, {formData.lng.toFixed(4)}
                    </p>
                  )}

                  {/* Manual fallback link */}
                  {!formData.lat && formData.country && (
                    <button type="button" onClick={() => setManualLocation(true)}
                      className="text-xs text-gray-500 hover:text-purple-400 transition text-left">
                      Venue not showing up? Enter it manually →
                    </button>
                  )}
                </>
              ) : (
                /* ── Manual location entry ── */
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-purple-400 font-medium flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Manual venue entry
                    </p>
                    <button type="button" onClick={() => {
                      setManualLocation(false);
                      setQuery("");
                      setFormData((p) => ({ ...p, location: "", lat: null, lng: null }));
                    }} className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition">
                      <X className="w-3 h-3" /> Back to search
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. The Alchemist Rooftop, Westlands, Nairobi"
                    value={formData.location}
                    onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))}
                    required
                    className={INPUT}
                  />
                  <p className="text-xs text-gray-600">
                    No map pin will be shown for this venue — attendees will see the name as typed.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-medium">Description</label>
            <textarea name="description" placeholder="Tell people what to expect at your event..."
              value={formData.description} onChange={handleChange} rows={4}
              className={`${INPUT} resize-none`} />
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-xs text-gray-400 mb-2 font-medium">Event Type *</label>
            <div className="grid grid-cols-2 gap-3">
              {(["rsvp", "paid"] as EventType[]).map((type) => (
                <button key={type} type="button"
                  onClick={() => setFormData((p) => ({ ...p, eventType: type, tickets: type === "rsvp" ? [] : p.tickets }))}
                  className={`py-3 rounded-lg border-2 text-sm font-semibold transition-all ${
                    formData.eventType === type
                      ? "border-purple-500 bg-purple-900/40 text-purple-300"
                      : "border-gray-600 bg-gray-800/30 text-gray-400 hover:border-gray-500"
                  }`}
                >
                  {type === "rsvp" ? "RSVP" : "Paid Tickets"}
                </button>
              ))}
            </div>
          </div>

          {/* RSVP settings */}
          {isRsvp && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-3">
              <p className="text-sm text-purple-300 font-medium">RSVP Settings</p>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Total Capacity *</label>
                <input type="number" name="capacity" min={1} value={formData.capacity}
                  onChange={handleChange} required placeholder="Max attendees" className={INPUT} />
                <p className="text-xs text-gray-500 mt-1">Attendees will RSVP for free. Set 0 for unlimited.</p>
              </div>
            </div>
          )}

          {/* Paid tickets */}
          {!isRsvp && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="flex items-center gap-2 text-sm text-purple-300 font-medium">
                  <Ticket className="h-4 w-4" /> Ticket Types
                </span>
                <button type="button" onClick={addTicket}
                  className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 font-medium transition">
                  <Plus className="h-4 w-4" /> Add Ticket
                </button>
              </div>
              {formData.tickets.length === 0 && (
                <p className="text-xs text-gray-500 italic text-center py-3">No tickets yet. Click "Add Ticket" to get started.</p>
              )}
              <div className="space-y-3">
                {formData.tickets.map((ticket, index) => (
                  <div key={index} className="flex gap-2 items-end bg-gray-900/60 p-3 rounded-lg flex-wrap border border-gray-700">
                    <div className="flex flex-col flex-1 min-w-[100px]">
                      <label className="text-xs text-gray-400 pb-1">Ticket Name</label>
                      <input type="text" placeholder="e.g. VIP, General" value={ticket.name}
                        onChange={(e) => handleTicketChange(index, "name", e.target.value)}
                        className="bg-gray-300 text-gray-800 rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-purple-400 placeholder-gray-500" />
                    </div>
                    <div className="flex flex-col w-24">
                      <label className="text-xs text-gray-400 pb-1">Price (KES)</label>
                      <input type="text" placeholder="1500" value={ticket.price}
                        onChange={(e) => handleTicketChange(index, "price", e.target.value)}
                        className="bg-gray-300 text-gray-800 rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-purple-400 placeholder-gray-500" />
                    </div>
                    <div className="flex flex-col w-24">
                      <label className="text-xs text-gray-400 pb-1">Quantity</label>
                      <input type="number" min={1} placeholder="50" value={ticket.capacity}
                        onChange={(e) => handleTicketChange(index, "capacity", Number(e.target.value))}
                        className="bg-gray-300 text-gray-800 rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-purple-400" />
                    </div>
                    <button type="button" onClick={() => removeTicket(index)}
                      className="text-red-400 hover:text-red-300 transition ml-1 pb-1">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Require Approval */}
          <label className="flex justify-between items-center cursor-pointer select-none">
            <div>
              <span className="text-gray-300 text-sm font-medium">Require Approval</span>
              <p className="text-xs text-gray-500">You manually approve each attendee</p>
            </div>
            <div onClick={() => setFormData((p) => ({ ...p, requireApproval: !p.requireApproval }))}
              className={`w-12 h-6 rounded-full transition-colors cursor-pointer flex items-center px-0.5 ${formData.requireApproval ? "bg-purple-600" : "bg-gray-600"}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${formData.requireApproval ? "translate-x-6" : "translate-x-0"}`} />
            </div>
          </label>

          {/* Error */}
          {submitError && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-sm text-red-300">{submitError}</div>
          )}

          {/* Success */}
          {submitStatus === "success" && (
            <div className="bg-green-900/30 border border-green-700 rounded-lg p-3 text-sm text-green-300 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Event created! Redirecting...
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={isSubmitting || submitStatus === "success"}
            className="w-full bg-purple-800 text-gray-100 rounded-lg px-4 py-3 text-sm font-bold hover:bg-purple-600 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer transition duration-300 flex items-center justify-center gap-2">
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating Event...</> : "Create Event"}
          </button>
        </form>
      </div>
    </div>
  );
}