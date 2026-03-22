"use client";
// app/marketplace/dashboard/components/ImageUploads.tsx
// SingleImageUpload and MultiImageUpload — shared by ListingForm and SettingsTab.

import { useRef, useState } from "react";
import { Upload, X, Plus, Loader2, ImageIcon } from "lucide-react";
import { compressImage } from "./types";

// ─── Single image upload ──────────────────────────────────────────────────────

export function SingleImageUpload({
  value, onChange, label, folder, aspectClass = "aspect-video",
}: {
  value: string; onChange: (url: string) => void;
  label: string; folder: string; aspectClass?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const blobRef  = useRef<string | null>(null);
  const [preview, setPreview] = useState(value);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    const local = URL.createObjectURL(file);
    blobRef.current = local;
    setPreview(local); setLoading(true); setError("");
    try {
      const compressed = await compressImage(file);
      const fd = new FormData();
      fd.append("file", new File([compressed], file.name, { type: "image/webp" }));
      fd.append("folder", folder);
      const res  = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      URL.revokeObjectURL(local); blobRef.current = null;
      setPreview(data.url); onChange(data.url);
    } catch {
      setError("Upload failed. Try again."); setPreview(value);
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
        {preview
          ? <img src={preview} alt={label} className="w-full h-full object-cover" />
          : <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500">
              <ImageIcon className="w-8 h-8" /><p className="text-xs">Click to upload</p>
            </div>}
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

// ─── Multi image upload ───────────────────────────────────────────────────────

export function MultiImageUpload({
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
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) throw new Error("Upload failed");
        return (await res.json()).url as string;
      }));
      onChange([...images, ...urls]);
    } catch { setError("One or more uploads failed. Try again."); }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = ""; }
  };

  const removeImage = (i: number) => onChange(images.filter((_, idx) => idx !== i));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-gray-400 text-xs font-semibold">
          Listing Images <span className="text-gray-600">({images.length}/{max})</span>
        </label>
        {images.length < max && (
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
            className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 font-semibold transition disabled:opacity-40">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {uploading ? "Uploading…" : "Add photos"}
          </button>
        )}
      </div>
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((url, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-gray-700 bg-gray-800 group">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button type="button" onClick={() => removeImage(i)}
                className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white">
                <X className="w-3 h-3" />
              </button>
              {i === 0 && <span className="absolute bottom-1 left-1 text-[10px] bg-black/70 text-white px-1.5 py-0.5 rounded-md">Cover</span>}
            </div>
          ))}
          {images.length < max && (
            <button type="button" onClick={() => inputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-gray-700 hover:border-purple-600 flex items-center justify-center text-gray-600 hover:text-purple-400 transition">
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
      {images.length === 0 && (
        <button type="button" onClick={() => inputRef.current?.click()}
          className="w-full h-28 rounded-xl border-2 border-dashed border-gray-700 hover:border-purple-600 flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-purple-400 transition">
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