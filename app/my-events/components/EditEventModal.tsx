"use client";
// app/my-events/components/EditEventModal.tsx
// Full event editor — all fields including image, date, time, venue.
// Detects date/time/venue changes and warns the organiser that
// ticket holders will be emailed automatically.

import React, { useState, useEffect, useRef } from "react";
import {
  X, Loader2, CheckCircle, AlertCircle, Upload,
  Calendar, Clock, MapPin, Image as ImageIcon, Info,
} from "lucide-react";
import { ManagedEvent } from "../types";

interface Props {
  event:   ManagedEvent;
  onClose: () => void;
  onSaved: (updated: Partial<ManagedEvent>) => void;
}

type SaveState = "idle" | "saving" | "saved" | "error";

// ─── Image compression (same pattern as event create form) ───────────────────

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

// ─── Parse existing date/time back into form fields ──────────────────────────

function parseEventDate(rawDate: string) {
  // rawDate is an ISO string from the DB
  const d = new Date(rawDate);
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const dd   = String(d.getDate()).padStart(2, "0");
  const hh   = String(d.getHours()).padStart(2, "0");
  const min  = String(d.getMinutes()).padStart(2, "0");
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}` };
}

const COUNTRIES = ["Kenya", "Tanzania", "Uganda"];

export function EditEventModal({ event, onClose, onSaved }: Props) {
  const { date: initDate, time: initTime } = parseEventDate(event.rawDate);

  const [title,        setTitle]       = useState(event.title);
  const [host,         setHost]        = useState(event.host);
  const [description,  setDesc]        = useState(event.description);
  const [startDate,    setStartDate]   = useState(initDate);
  const [startTime,    setStartTime]   = useState(initTime);
  const [endDate,      setEndDate]     = useState("");
  const [endTime,      setEndTime]     = useState("");
  const [country,      setCountry]     = useState("Kenya");
  const [location,     setLocation]    = useState(event.location);
  const [manualLoc,    setManualLoc]   = useState(true); // start in manual mode (already has a location)
  const [query,        setQuery]       = useState(event.location);
  const [suggestions,  setSuggestions] = useState<any[]>([]);
  const [locLoading,   setLocLoading]  = useState(false);
  const [lat,          setLat]         = useState<number | null>(null);
  const [lng,          setLng]         = useState<number | null>(null);
  const [image,        setImage]       = useState(event.image);
  const [imgPreview,   setImgPreview]  = useState(event.image);
  const [imgUploading, setImgUploading]= useState(false);
  const [saveState,    setSaveState]   = useState<SaveState>("idle");
  const [errorMsg,     setErrorMsg]    = useState("");
  const blobRef  = useRef<string | null>(null);
  const fileRef  = useRef<HTMLInputElement>(null);

  // Check if critical fields have changed
  const dateChanged     = startDate !== initDate;
  const timeChanged     = startTime !== initTime;
  const locationChanged = location  !== event.location;
  const criticalChanged = dateChanged || timeChanged || locationChanged;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // ── Image upload ────────────────────────────────────────────────────────────
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    const local = URL.createObjectURL(file);
    blobRef.current = local;
    setImgPreview(local);
    setImgUploading(true);
    setErrorMsg("");
    try {
      const compressed = await compressImage(file);
      const fd = new FormData();
      fd.append("file",   new File([compressed], file.name, { type: "image/webp" }));
      fd.append("folder", "events");
      const res  = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      URL.revokeObjectURL(local);
      blobRef.current = null;
      setImgPreview(data.url);
      setImage(data.url);
    } catch {
      setErrorMsg("Image upload failed. Please try again.");
      setImgPreview(event.image);
      setImage(event.image);
    } finally {
      setImgUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // ── Venue search ────────────────────────────────────────────────────────────
  async function handleVenueSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    setLocation(q);
    setLat(null); setLng(null);
    if (q.length > 2 && country) {
      setLocLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(`${q}, ${country}`)}&addressdetails=1&limit=5`
        );
        setSuggestions(await res.json());
      } catch { /* silent */ }
      finally { setLocLoading(false); }
    } else {
      setSuggestions([]);
    }
  }

  function selectVenue(place: any) {
    setLocation(place.display_name);
    setQuery(place.display_name);
    setLat(parseFloat(place.lat));
    setLng(parseFloat(place.lon));
    setSuggestions([]);
    setManualLoc(false);
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!title.trim()) { setErrorMsg("Event title is required."); return; }
    if (imgUploading)  { setErrorMsg("Please wait for the image to finish uploading."); return; }

    setSaveState("saving"); setErrorMsg("");
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, host, description, location,
          image, startDate, startTime, endDate, endTime,
          lat, lng,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }
      setSaveState("saved");
      onSaved({ title, host, description, location, image, date: event.date });
      setTimeout(onClose, 1200);
    } catch (err: any) {
      setErrorMsg(err.message ?? "Something went wrong");
      setSaveState("error");
    }
  }

  const INPUT = "w-full bg-gray-800/60 border border-gray-700 hover:border-gray-600 focus:border-violet-500 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 outline-none transition";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full sm:max-w-2xl bg-gray-950 border border-gray-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        style={{ animation: "slideUp 0.22s cubic-bezier(0.34,1.2,0.64,1)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800">
          <div>
            <h2 className="text-lg font-bold text-gray-100">Edit Event</h2>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-72">{event.title}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-200 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-6 space-y-6 max-h-[70vh] overflow-y-auto">

          {/* Critical change warning */}
          {criticalChanged && (
            <div className="flex items-start gap-3 bg-amber-900/20 border border-amber-700/40 rounded-xl px-4 py-3">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-300 text-sm font-semibold">Ticket holders will be notified</p>
                <p className="text-amber-400/80 text-xs mt-0.5">
                  You've changed {[dateChanged && "the date", timeChanged && "the time", locationChanged && "the venue"].filter(Boolean).join(", ")}. All confirmed attendees will automatically receive an update email.
                </p>
              </div>
            </div>
          )}

          {/* Event image */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" /> Event Image
            </label>
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-gray-700 bg-gray-800 cursor-pointer group"
              onClick={() => fileRef.current?.click()}>
              {imgPreview
                ? <img src={imgPreview} alt="" className="w-full h-full object-cover" />
                : <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500"><Upload className="w-8 h-8"/><p className="text-sm">Click to upload</p></div>
              }
              {imgUploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-white"/>
                  <span className="text-white text-sm">Uploading…</span>
                </div>
              )}
              <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1 text-white text-xs opacity-0 group-hover:opacity-100 transition">
                <Upload className="w-3 h-3"/> Change photo
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </div>

          {/* Title + Host */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Event Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Jazz Night Live"
                className={INPUT} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Hosted By</label>
              <input value={host} onChange={e => setHost(e.target.value)} placeholder="e.g. Noizy Nightz"
                className={INPUT} />
            </div>
          </div>

          {/* Dates */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Date & Time
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-500 text-xs mb-1">Start date *</p>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={INPUT} />
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Start time *</p>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={INPUT} />
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">End date</p>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={INPUT} />
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">End time</p>
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className={INPUT} />
              </div>
            </div>
          </div>

          {/* Venue */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Venue
            </label>

            <select value={country} onChange={e => setCountry(e.target.value)} className={`${INPUT} mb-3`}>
              {COUNTRIES.map(c => <option key={c}>{c}</option>)}
            </select>

            {manualLoc ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-purple-400 text-xs font-semibold flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Manual entry
                  </p>
                  <button type="button" onClick={() => { setManualLoc(false); setQuery(""); setLocation(""); }}
                    className="text-xs text-gray-500 hover:text-gray-300 transition">Switch to search →</button>
                </div>
                <input value={location} onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. The Alchemist Rooftop, Westlands, Nairobi"
                  className={INPUT} />
              </div>
            ) : (
              <div className="relative">
                <input value={query} onChange={handleVenueSearch}
                  placeholder="Search venue name…"
                  className={INPUT} />
                {query.length > 2 && (
                  <ul className="absolute z-50 bg-gray-900 border border-gray-700 rounded-xl mt-1 w-full shadow-xl max-h-48 overflow-y-auto">
                    {locLoading ? (
                      <li className="p-3 text-sm text-gray-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/>Searching…</li>
                    ) : suggestions.length > 0 ? (
                      <>
                        {suggestions.map((p, i) => (
                          <li key={i} onClick={() => selectVenue(p)}
                            className="p-3 text-sm text-gray-300 hover:bg-gray-700 cursor-pointer border-b border-gray-800 last:border-none">
                            {p.display_name}
                          </li>
                        ))}
                        <li onClick={() => { setManualLoc(true); setSuggestions([]); setLocation(query); }}
                          className="p-3 text-sm text-purple-400 hover:bg-gray-700 cursor-pointer border-t border-gray-700">
                          Use "{query}" as-is
                        </li>
                      </>
                    ) : (
                      <li className="p-3 text-sm text-gray-500 italic">No results — <button onClick={() => { setManualLoc(true); setSuggestions([]); setLocation(query); }} className="text-purple-400 hover:underline">enter manually</button></li>
                    )}
                  </ul>
                )}
                {lat && lng && (
                  <p className="text-xs text-green-400 flex items-center gap-1 mt-1">
                    <CheckCircle className="w-3 h-3"/> Coordinates saved: {lat.toFixed(4)}, {lng.toFixed(4)}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Description</label>
            <textarea value={description} onChange={e => setDesc(e.target.value)} rows={4}
              placeholder="Tell people what to expect…"
              className={`${INPUT} resize-none`} />
          </div>

          {/* Tickets note */}
          <div className="flex items-center gap-2 bg-gray-800/40 border border-gray-700 rounded-xl px-4 py-3 text-gray-500 text-xs">
            <Info className="w-3.5 h-3.5 shrink-0" />
            Ticket types and pricing are managed separately from the event detail panel.
          </div>

          {/* Error */}
          {errorMsg && (
            <div className="flex items-center gap-2 bg-red-900/30 border border-red-700/40 rounded-xl px-4 py-3 text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-5 border-t border-gray-800">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-300 font-medium transition px-4 py-2">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saveState === "saving" || saveState === "saved" || imgUploading}
            className={`flex items-center gap-2 text-sm font-semibold px-6 py-2.5 rounded-xl transition ${
              saveState === "saved"
                ? "bg-emerald-700 text-white"
                : "bg-violet-700 hover:bg-violet-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            }`}
          >
            {saveState === "saving" && <Loader2 className="w-4 h-4 animate-spin" />}
            {saveState === "saved"  && <CheckCircle className="w-4 h-4" />}
            {saveState === "saved" ? "Saved!" : saveState === "saving" ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(24px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}