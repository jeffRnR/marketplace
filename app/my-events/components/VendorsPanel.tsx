"use client";
// app/my-events/components/VendorsPanel.tsx
// Drop this as a new tab in EventRow / my-events dashboard

import React, { useEffect, useState, useCallback } from "react";
import {
  Store, CheckCircle, XCircle, Clock, Star, MapPin,
  Phone, Mail, ChevronDown, ChevronUp, Loader2,
  BadgeCheck, ExternalLink, MessageSquare, Send,
} from "lucide-react";

interface VendorApp {
  id: string;
  status: "pending" | "approved" | "rejected";
  message: string;
  servicesOffered: string;
  proposedPrice: number | null;
  currency: string;
  ownerNote: string | null;
  createdAt: string;
  profile: {
    id: string;
    businessName: string;
    category: string;
    logoImage: string | null;
    rating: number;
    reviewCount: number;
    location: string;
    phone: string;
    email: string;
  };
}

const STATUS_STYLES = {
  pending:  "bg-amber-900/30 border-amber-700/40 text-amber-400",
  approved: "bg-green-900/30 border-green-700/40 text-green-400",
  rejected: "bg-red-900/30 border-red-700/40 text-red-400",
};

const STATUS_ICONS = {
  pending:  <Clock className="w-3.5 h-3.5" />,
  approved: <CheckCircle className="w-3.5 h-3.5" />,
  rejected: <XCircle className="w-3.5 h-3.5" />,
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`w-3 h-3 ${i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-gray-700"}`} />
      ))}
    </div>
  );
}

function AppCard({ app, onDecision }: {
  app: VendorApp;
  onDecision: (id: string, status: "approved"|"rejected", note: string) => Promise<void>;
}) {
  const [open, setOpen]     = useState(false);
  const [note, setNote]     = useState(app.ownerNote ?? "");
  const [saving, setSaving] = useState<"approved"|"rejected"|null>(null);

  const decide = async (status: "approved"|"rejected") => {
    setSaving(status);
    await onDecision(app.id, status, note);
    setSaving(null);
  };

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${open ? "border-gray-700" : "border-gray-800"} bg-gray-900`}>
      {/* Header row */}
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-800/40 transition">
        {/* Logo */}
        <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 overflow-hidden flex items-center justify-center shrink-0">
          {app.profile.logoImage
            ? <img src={app.profile.logoImage} alt="" className="w-full h-full object-cover" />
            : <Store className="w-5 h-5 text-purple-400" />
          }
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-gray-200 font-semibold text-sm truncate">{app.profile.businessName}</p>
            {app.profile.rating > 0 && (
              <div className="flex items-center gap-1 shrink-0">
                <Stars rating={app.profile.rating} />
                <span className="text-gray-500 text-xs">({app.profile.reviewCount})</span>
              </div>
            )}
          </div>
          <p className="text-gray-500 text-xs truncate">{app.profile.category} · {app.profile.location}</p>
        </div>

        {/* Status + chevron */}
        <div className="flex items-center gap-3 shrink-0">
          <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-semibold ${STATUS_STYLES[app.status]}`}>
            {STATUS_ICONS[app.status]}
            {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
          </span>
          {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </div>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-gray-800 p-4 space-y-4">
          {/* Services offered */}
          <div className="bg-gray-800/60 rounded-xl p-3">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">Services Offered</p>
            <p className="text-gray-300 text-sm">{app.servicesOffered}</p>
          </div>

          {/* Pitch */}
          <div className="bg-gray-800/60 rounded-xl p-3">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">Their Pitch</p>
            <p className="text-gray-300 text-sm">{app.message}</p>
          </div>

          {app.proposedPrice && (
            <p className="text-purple-400 text-sm font-semibold">
              Proposed: {app.currency} {app.proposedPrice.toLocaleString()}
            </p>
          )}

          {/* Contact */}
          <div className="flex flex-wrap gap-4 text-sm">
            <a href={`tel:${app.profile.phone}`} className="flex items-center gap-1.5 text-gray-400 hover:text-gray-200 transition">
              <Phone className="w-3.5 h-3.5 text-green-500" /> {app.profile.phone}
            </a>
            <a href={`mailto:${app.profile.email}`} className="flex items-center gap-1.5 text-gray-400 hover:text-gray-200 transition">
              <Mail className="w-3.5 h-3.5 text-blue-500" /> {app.profile.email}
            </a>
            <a href={`/marketplace/${app.profile.id}`} target="_blank"
              className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 transition">
              <ExternalLink className="w-3.5 h-3.5" /> View full profile
            </a>
          </div>

          {/* Response note + actions */}
          {app.status === "pending" && (
            <div className="space-y-3 pt-2 border-t border-gray-800">
              <div>
                <label className="block text-gray-400 text-xs mb-1.5">Note to vendor (optional)</label>
                <textarea value={note} onChange={e => setNote(e.target.value)}
                  rows={2} placeholder="Add a note explaining your decision…"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-gray-200 text-sm focus:outline-none focus:border-purple-600 resize-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => decide("approved")} disabled={!!saving}
                  className="flex items-center gap-2 bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition">
                  {saving === "approved" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Approve
                </button>
                <button onClick={() => decide("rejected")} disabled={!!saving}
                  className="flex items-center gap-2 bg-red-900/50 hover:bg-red-800 border border-red-700/50 disabled:opacity-40 text-red-300 font-bold px-5 py-2.5 rounded-xl text-sm transition">
                  {saving === "rejected" ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Decline
                </button>
              </div>
            </div>
          )}

          {app.status !== "pending" && app.ownerNote && (
            <div className="bg-gray-800 rounded-xl p-3 border-t border-gray-700">
              <p className="text-gray-500 text-xs font-semibold mb-1">Your note to vendor:</p>
              <p className="text-gray-300 text-sm">{app.ownerNote}</p>
            </div>
          )}

          {/* Re-decision if already decided */}
          {app.status !== "pending" && (
            <div className="flex gap-3 pt-2 border-t border-gray-800">
              {app.status === "rejected" && (
                <button onClick={() => decide("approved")} disabled={!!saving}
                  className="flex items-center gap-2 bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white font-semibold px-4 py-2 rounded-xl text-sm transition">
                  {saving === "approved" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  Approve Instead
                </button>
              )}
              {app.status === "approved" && (
                <button onClick={() => decide("rejected")} disabled={!!saving}
                  className="flex items-center gap-2 bg-red-900/40 border border-red-700/30 hover:bg-red-800 disabled:opacity-40 text-red-300 font-semibold px-4 py-2 rounded-xl text-sm transition">
                  {saving === "rejected" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  Revoke Approval
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export default function VendorsPanel({ eventId }: { eventId: number }) {
  const [apps, setApps]     = useState<VendorApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]  = useState<"all"|"pending"|"approved"|"rejected">("all");

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/marketplace/applications?eventId=${eventId}`);
      const data = await res.json();
      setApps(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const handleDecision = async (id: string, status: "approved"|"rejected", ownerNote: string) => {
    await fetch("/api/marketplace/applications", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId: id, status, ownerNote }),
    });
    await fetchApps();
  };

  const filtered = apps.filter(a => filter === "all" || a.status === filter);
  const counts   = {
    all:      apps.length,
    pending:  apps.filter(a => a.status === "pending").length,
    approved: apps.filter(a => a.status === "approved").length,
    rejected: apps.filter(a => a.status === "rejected").length,
  };

  if (loading) return (
    <div className="flex justify-center py-12">
      <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-gray-200 font-bold">Vendor Applications</h3>
        <p className="text-gray-500 text-sm">
          {counts.pending > 0 && <span className="text-amber-400 font-semibold">{counts.pending} pending · </span>}
          {counts.approved} approved
        </p>
      </div>

      {/* Filter tabs */}
      {apps.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {(["all","pending","approved","rejected"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === f ? "bg-gray-700 text-gray-100" : "bg-gray-900 text-gray-500 hover:text-gray-300 border border-gray-800"
              }`}>
              {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
            </button>
          ))}
        </div>
      )}

      {apps.length === 0 ? (
        <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-2xl">
          <Store className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 font-semibold mb-1">No vendor applications yet</p>
          <p className="text-gray-600 text-sm">Vendors can apply to this event from the marketplace</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-gray-600 text-sm text-center py-8">No {filter} applications</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(app => (
            <AppCard key={app.id} app={app} onDecision={handleDecision} />
          ))}
        </div>
      )}
    </div>
  );
}