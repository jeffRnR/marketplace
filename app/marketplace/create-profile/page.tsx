"use client";
// app/marketplace/create-profile/page.tsx

import React, { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Store, MapPin, Phone, Mail, Globe, Instagram, Twitter, Facebook, Music,
  Image as ImageIcon, ChevronRight, Loader2, CheckCircle, Upload, X,
  Music2, Utensils, Wine, Mic2, Users, Camera, Tent, Truck,
  Lightbulb, Drama, Car, Flower2, Shield, Printer, Wifi, Package,
} from "lucide-react";

const CATEGORIES = [
  { label: "Venue",            icon: Tent },
  { label: "Sound & Lighting", icon: Lightbulb },
  { label: "Catering",         icon: Utensils },
  { label: "Bar & Alcohol",    icon: Wine },
  { label: "DJ Services",      icon: Music2 },
  { label: "Live Music",       icon: Mic2 },
  { label: "Photography",      icon: Camera },
  { label: "Staffing & HR",    icon: Users },
  { label: "Decor & Florals",  icon: Flower2 },
  { label: "Entertainment",    icon: Drama },
  { label: "Transport",        icon: Car },
  { label: "Logistics",        icon: Truck },
  { label: "Security",         icon: Shield },
  { label: "Tech & AV",        icon: Wifi },
  { label: "Print & Branding", icon: Printer },
  { label: "Merchandise",      icon: Package },
];

const STEPS = ["Category", "Business Info", "Contact", "Media"];

// ─── Image uploader component ─────────────────────────────────────────────────

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX    = 1200;
      let { width, height } = img;
      if (width > MAX) { height = (height * MAX) / width; width = MAX; }
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => resolve(blob!), "image/webp", 0.8);
    };
    img.src = url;
  });
}

function ImageUploader({
  label,
  value,
  onChange,
  aspect = "cover",
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  aspect?: "cover" | "logo";
}) {
  const inputRef                  = useRef<HTMLInputElement>(null);
  const blobUrlRef                = useRef<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview]     = useState(value || "");
  const [uploadError, setUploadError] = useState("");

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { setUploadError("Please select an image file"); return; }

    // Show local preview immediately
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    const localUrl      = URL.createObjectURL(file);
    blobUrlRef.current  = localUrl;
    setPreview(localUrl);
    setUploading(true);
    setUploadError("");

    try {
      const compressed = await compressImage(file);
      const fd = new FormData();
      fd.append("file", new File([compressed], file.name, { type: "image/webp" }));
      const res  = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      URL.revokeObjectURL(localUrl);
      blobUrlRef.current = null;
      setPreview(data.url);
      onChange(data.url);
    } catch (err: any) {
      setUploadError(err.message ?? "Upload failed");
      setPreview("");
      onChange("");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const isCover = aspect === "cover";

  return (
    <div>
      <label className="flex items-center gap-1.5 text-gray-400 text-sm mb-2">
        <ImageIcon className="w-3.5 h-3.5" /> {label}
      </label>

      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className={`w-full object-cover rounded-xl border border-gray-700 ${isCover ? "h-36" : "h-24 w-24"}`}
          />
          {uploading && (
            <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-white" />
              <span className="text-white text-xs">Uploading…</span>
            </div>
          )}
          {!uploading && (
            <>
              <button
                onClick={() => { setPreview(""); onChange(""); }}
                className="absolute top-2 right-2 bg-gray-900/80 hover:bg-gray-800 text-gray-300 rounded-full p-1 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => inputRef.current?.click()}
                className="absolute bottom-2 right-2 bg-gray-900/80 hover:bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded-lg border border-gray-700 transition"
              >
                Change
              </button>
            </>
          )}
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          className={`relative flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-700 rounded-xl cursor-pointer hover:border-purple-600 hover:bg-purple-900/10 transition-all ${
            isCover ? "h-36" : "h-24"
          } ${uploading ? "pointer-events-none opacity-60" : ""}`}
        >
          {uploading ? (
            <>
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
              <span className="text-gray-500 text-xs">Uploading…</span>
            </>
          ) : (
            <>
              <Upload className="w-6 h-6 text-gray-600" />
              <span className="text-gray-500 text-xs text-center px-4">
                Click or drag & drop to upload<br />
                <span className="text-gray-600">JPG, PNG, WEBP · max 10 MB</span>
              </span>
            </>
          )}
        </div>
      )}

      {uploadError && (
        <p className="text-red-400 text-xs mt-1">{uploadError}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CreateProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [step, setStep]     = useState(0);
  const [saving, setSaving] = useState(false);
  const [done, setDone]     = useState(false);
  const [error, setError]   = useState("");

  const [form, setForm] = useState({
    category:     "",
    subCategory:  "",
    businessName: "",
    tagline:      "",
    description:  "",
    location:     "",
    phone:        "",
    email:        "",
    website:      "",
    instagram:    "",
    twitter:      "",
    facebook:     "",
    tiktok:       "",
    coverImage:   "",
    logoImage:    "",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const canNext = () => {
    if (step === 0) return !!form.category;
    if (step === 1) return !!(form.businessName.trim() && form.description.trim() && form.location.trim());
    if (step === 2) return !!(form.phone.trim() && form.email.trim());
    return true;
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/marketplace/profiles", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create profile");
      setDone(true);
      setTimeout(() => router.push("/marketplace/dashboard"), 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-center">
          <Store className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400 font-semibold mb-2">Sign in to create a market profile</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-gray-100 font-bold text-2xl mb-2">Profile Created!</h2>
          <p className="text-gray-400">Redirecting to your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-100 mb-2">Create Your Market Profile</h1>
          <p className="text-gray-400">List your services and reach event organizers across the platform</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 text-sm font-semibold transition-colors ${
                i === step ? "text-purple-400" : i < step ? "text-green-400" : "text-gray-600"
              }`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  i === step ? "border-purple-500 bg-purple-900/50 text-purple-300"
                  : i < step  ? "border-green-500 bg-green-900/30 text-green-400"
                  :             "border-gray-700 text-gray-600"
                }`}>
                  {i < step ? "✓" : i + 1}
                </div>
                <span className="hidden sm:inline">{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 rounded ${i < step ? "bg-green-700" : "bg-gray-800"}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">

          {/* Step 0: Category */}
          {step === 0 && (
            <div>
              <h2 className="text-gray-100 font-bold text-xl mb-1">What do you offer?</h2>
              <p className="text-gray-500 text-sm mb-6">Choose the category that best describes your business</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {CATEGORIES.map(cat => {
                  const Icon   = cat.icon;
                  const active = form.category === cat.label;
                  return (
                    <button
                      key={cat.label}
                      onClick={() => set("category", cat.label)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-sm font-semibold ${
                        active
                          ? "border-purple-500 bg-purple-900/30 text-purple-300"
                          : "border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-300"
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                      <span className="text-center leading-tight">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
              {form.category && (
                <div className="mt-5">
                  <label className="block text-gray-400 text-sm mb-2">
                    Sub-category <span className="text-gray-600">(optional)</span>
                  </label>
                  <input
                    value={form.subCategory}
                    onChange={e => set("subCategory", e.target.value)}
                    placeholder="e.g. Outdoor Venue, PA Systems, Street Food…"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 placeholder-gray-600 text-sm focus:outline-none focus:border-purple-600"
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 1: Business Info */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-gray-100 font-bold text-xl mb-1">Business Details</h2>
                <p className="text-gray-500 text-sm mb-6">Tell people about your business</p>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Business / Brand Name <span className="text-red-400">*</span>
                </label>
                <input
                  value={form.businessName}
                  onChange={e => set("businessName", e.target.value)}
                  placeholder="Acme Events & Catering"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 placeholder-gray-600 text-sm focus:outline-none focus:border-purple-600"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Tagline <span className="text-gray-600">(optional)</span>
                </label>
                <input
                  value={form.tagline}
                  onChange={e => set("tagline", e.target.value)}
                  placeholder="Making every event unforgettable"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 placeholder-gray-600 text-sm focus:outline-none focus:border-purple-600"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={e => set("description", e.target.value)}
                  placeholder="Describe your services, experience, what makes you stand out…"
                  rows={5}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 placeholder-gray-600 text-sm focus:outline-none focus:border-purple-600 resize-none"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-gray-400 text-sm mb-2">
                  <MapPin className="w-3.5 h-3.5" /> Location / Area <span className="text-red-400">*</span>
                </label>
                <input
                  value={form.location}
                  onChange={e => set("location", e.target.value)}
                  placeholder="Nairobi, Kenya"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 placeholder-gray-600 text-sm focus:outline-none focus:border-purple-600"
                />
              </div>
            </div>
          )}

          {/* Step 2: Contact */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-gray-100 font-bold text-xl mb-1">Contact Information</h2>
                <p className="text-gray-500 text-sm mb-6">How can potential clients reach you?</p>
              </div>
              {[
                { key: "phone",     icon: Phone,     label: "Phone Number",      placeholder: "+254 700 000 000",        required: true },
                { key: "email",     icon: Mail,      label: "Business Email",    placeholder: "hello@yourbusiness.com",  required: true },
                { key: "website",   icon: Globe,     label: "Website",           placeholder: "https://yourbusiness.com" },
                { key: "instagram", icon: Instagram, label: "Instagram handle",   placeholder: "@yourbusiness" },
                { key: "twitter",   icon: Twitter,   label: "Twitter / X handle", placeholder: "@yourbusiness" },
                { key: "facebook",  icon: Facebook,  label: "Facebook page",       placeholder: "https://facebook.com/yourbusiness" },
                { key: "tiktok",    icon: Music2,     label: "TikTok handle",       placeholder: "@yourbusiness" },
              ].map(({ key, icon: Icon, label, placeholder, required }) => (
                <div key={key}>
                  <label className="flex items-center gap-1.5 text-gray-400 text-sm mb-2">
                    <Icon className="w-3.5 h-3.5" /> {label} {required && <span className="text-red-400">*</span>}
                  </label>
                  <input
                    value={(form as any)[key]}
                    onChange={e => set(key, e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 placeholder-gray-600 text-sm focus:outline-none focus:border-purple-600"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Step 3: Media */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-gray-100 font-bold text-xl mb-1">Profile Media</h2>
                <p className="text-gray-500 text-sm">Upload a cover photo and logo directly from your device</p>
              </div>

              <ImageUploader
                label="Cover Photo"
                value={form.coverImage}
                onChange={v => set("coverImage", v)}
                aspect="cover"
              />

              <ImageUploader
                label="Logo / Profile Image"
                value={form.logoImage}
                onChange={v => set("logoImage", v)}
                aspect="logo"
              />

              {/* Summary */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-2 text-sm">
                <p className="text-gray-400 font-semibold mb-3">Profile Summary</p>
                <div className="flex justify-between"><span className="text-gray-500">Category</span><span className="text-gray-300 font-medium">{form.category}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Business</span><span className="text-gray-300 font-medium">{form.businessName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Location</span><span className="text-gray-300 font-medium">{form.location}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Contact</span><span className="text-gray-300 font-medium">{form.phone}</span></div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700/50 text-red-400 rounded-xl px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className="px-5 py-3 rounded-xl border border-gray-700 text-gray-400 font-semibold text-sm hover:border-gray-600 hover:text-gray-300 disabled:opacity-30 transition"
          >
            Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold rounded-xl transition text-sm"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving || !canNext()}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold rounded-xl transition text-sm"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : "Create Profile"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}