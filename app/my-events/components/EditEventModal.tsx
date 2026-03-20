"use client";
// app/my-events/components/EditEventModal.tsx

import React, { useState, useEffect } from "react";
import { X, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { ManagedEvent } from "../types";

interface EditEventModalProps {
  event: ManagedEvent;
  onClose: () => void;
  onSaved: (updated: Partial<ManagedEvent>) => void;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function EditEventModal({ event, onClose, onSaved }: EditEventModalProps) {
  const [form, setForm] = useState({
    title: event.title,
    host: event.host,
    description: event.description,
    location: event.location,
    time: event.time,
  });
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setErrorMsg("Event title is required."); return; }
    setSaveState("saving");
    setErrorMsg("");
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }
      setSaveState("saved");
      onSaved(form);
      setTimeout(onClose, 1200);
    } catch (err: any) {
      setErrorMsg(err.message ?? "Something went wrong");
      setSaveState("error");
    }
  };

  const fields: {
    name: keyof typeof form;
    label: string;
    multiline?: boolean;
    placeholder: string;
  }[] = [
    { name: "title",       label: "Event Title",  placeholder: "e.g. Noizy Nightz: Purple Fest" },
    { name: "host",        label: "Hosted By",    placeholder: "e.g. Noizy Nightz" },
    { name: "time",        label: "Time",         placeholder: "e.g. 19:00 – 00:00" },
    { name: "location",    label: "Location",     placeholder: "Venue name and city" },
    { name: "description", label: "Description",  multiline: true, placeholder: "Tell people what to expect..." },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-xl bg-gray-950 border border-gray-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
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
        <div className="px-6 py-6 space-y-5 max-h-[65vh] overflow-y-auto">
          {fields.map(({ name, label, multiline, placeholder }) => (
            <div key={name}>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{label}</label>
              {multiline ? (
                <textarea
                  name={name}
                  value={form[name]}
                  onChange={handleChange}
                  placeholder={placeholder}
                  rows={4}
                  className="w-full bg-gray-800/60 border border-gray-700 hover:border-gray-600 focus:border-violet-500 rounded-2xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 outline-none resize-none transition"
                />
              ) : (
                <input
                  type="text"
                  name={name}
                  value={form[name]}
                  onChange={handleChange}
                  placeholder={placeholder}
                  className="w-full bg-gray-800/60 border border-gray-700 hover:border-gray-600 focus:border-violet-500 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 outline-none transition"
                />
              )}
            </div>
          ))}
          <p className="text-xs text-gray-600 bg-gray-800/30 rounded-xl px-4 py-3">
            To change the event date, delete and recreate the event. Date changes affecting attendees require manual notification.
          </p>
          {errorMsg && (
            <div className="flex items-center gap-2 bg-red-900/30 border border-red-700/40 rounded-xl px-4 py-3 text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />{errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-5 border-t border-gray-800">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-300 font-medium transition px-4 py-2">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saveState === "saving" || saveState === "saved"}
            className={`flex items-center gap-2 text-sm font-semibold px-6 py-2.5 rounded-xl transition ${
              saveState === "saved" ? "bg-emerald-700 text-white" :
              "bg-violet-700 hover:bg-violet-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            }`}
          >
            {saveState === "saving" && <Loader2 className="w-4 h-4 animate-spin" />}
            {saveState === "saved" && <CheckCircle className="w-4 h-4" />}
            {saveState === "saved" ? "Saved!" : saveState === "saving" ? "Saving..." : "Save Changes"}
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