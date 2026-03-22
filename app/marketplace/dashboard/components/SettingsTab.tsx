"use client";
// app/marketplace/dashboard/components/SettingsTab.tsx

import { Loader2, Save } from "lucide-react";
import { SingleImageUpload } from "./ImageUploads";

interface Props {
  settingsForm: any;
  setSettingsForm: (fn: (f: any) => any) => void;
  onSave: () => void;
  saving: boolean;
}

export default function SettingsTab({ settingsForm, setSettingsForm, onSave, saving }: Props) {
  if (!settingsForm) return null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-6">
      <h2 className="text-gray-200 font-bold">Profile Settings</h2>

      {/* Cover + Logo */}
      <div className="grid sm:grid-cols-2 gap-4">
        <SingleImageUpload
          value={settingsForm.coverImage}
          onChange={url => setSettingsForm(f => ({ ...f, coverImage: url }))}
          label="Cover Image"
          folder="marketplace/covers"
          aspectClass="aspect-video"
        />
        <SingleImageUpload
          value={settingsForm.logoImage}
          onChange={url => setSettingsForm(f => ({ ...f, logoImage: url }))}
          label="Logo / Profile Photo"
          folder="marketplace/logos"
          aspectClass="aspect-square"
        />
      </div>

      {/* Text fields */}
      {(["businessName","tagline","location","phone","email","website","instagram"] as const).map(key => (
        <div key={key}>
          <label className="block text-gray-400 text-sm mb-1.5 capitalize">
            {key.replace(/([A-Z])/g, " $1").trim()}
            {key === "businessName" && <span className="text-red-400"> *</span>}
          </label>
          <input
            value={settingsForm[key]}
            onChange={e => setSettingsForm(f => ({ ...f, [key]: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-200 text-sm focus:outline-none focus:border-purple-600"
          />
        </div>
      ))}

      <div>
        <label className="block text-gray-400 text-sm mb-1.5">Description</label>
        <textarea
          value={settingsForm.description}
          onChange={e => setSettingsForm(f => ({ ...f, description: e.target.value }))}
          rows={4}
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-200 text-sm focus:outline-none focus:border-purple-600 resize-none"
        />
      </div>

      {/* Active toggle */}
      <div className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
        <div>
          <p className="text-gray-300 text-sm font-semibold">Profile Active</p>
          <p className="text-gray-500 text-xs">When paused, your profile won't appear in search results</p>
        </div>
        <button
          onClick={() => setSettingsForm(f => ({ ...f, isActive: !f.isActive }))}
          className={`relative w-12 h-6 rounded-full transition-all ${settingsForm.isActive ? "bg-purple-600" : "bg-gray-700"}`}
        >
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${settingsForm.isActive ? "left-7" : "left-1"}`} />
        </button>
      </div>

      <button onClick={onSave} disabled={saving}
        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold px-6 py-3 rounded-xl transition text-sm w-full justify-center">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save Changes
      </button>
    </div>
  );
}