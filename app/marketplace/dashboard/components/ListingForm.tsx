"use client";
// app/marketplace/dashboard/components/ListingForm.tsx

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Listing, PRICE_TYPES, LISTING_CATEGORIES } from "./types";
import { MultiImageUpload } from "./ImageUploads";

interface Props {
  initial?: Partial<Listing>;
  profileCategory: string;
  onSave: (d: any) => void;
  onCancel: () => void;
  saving: boolean;
}

export default function ListingForm({ initial, profileCategory, onSave, onCancel, saving }: Props) {
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

      <MultiImageUpload images={form.images} onChange={urls => set("images", urls)} folder="listings" max={5} />

      <div>
        <label className="block text-gray-400 text-xs mb-1.5">Tags <span className="text-gray-600">(comma-separated)</span></label>
        <input value={form.tags} onChange={e => set("tags", e.target.value)} placeholder="wedding, outdoor, buffet…"
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-gray-200 text-sm focus:outline-none focus:border-purple-600" />
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={() => onSave({
          ...form,
          price: form.price ? Number(form.price) : null,
          tags:  form.tags.split(",").map(s => s.trim()).filter(Boolean),
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