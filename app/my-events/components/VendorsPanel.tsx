"use client";
// app/my-events/components/VendorsPanel.tsx
// Full vending slot management panel for event owners.
//
// FLOW:
//   Owner creates slots (title, description, price, total spots)
//   → Vendors apply from /events/[id]/vending (public page)
//   → Owner sees applications here, approves or rejects
//   → Approved vendor pays via M-Pesa STK push
//   → Webhook confirms → slot booked → owner wallet credited

import React, { useEffect, useState, useCallback } from "react";
import {
  Store, Plus, Pencil, Trash2, CheckCircle, XCircle,
  Clock, Loader2, ChevronDown, ChevronUp, Star,
  ExternalLink, AlertTriangle, Wallet, Users,
  ToggleLeft, ToggleRight, BadgeCheck, Copy, Check,
} from "lucide-react";
import Link from "next/link";
import ShareSlotButton from "@/components/ShareSlotModal";

// ─── Copy link button ─────────────────────────────────────────────────────────

function CopyLinkButton({ url, label = "Copy link" }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition shrink-0 ${
        copied
          ? "bg-green-900/30 border-green-700/40 text-green-400"
          : "bg-gray-800 border-gray-700 text-gray-400 hover:border-purple-500 hover:text-purple-300"
      }`}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied!" : label}
    </button>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface VendingSlot {
  id:           string;
  title:        string;
  description:  string | null;
  price:        number;
  currency:     string;
  totalSlots:   number;
  status:       "open" | "closed";
  bookedCount:  number;
  applications: SlotApplication[];
}

interface SlotApplication {
  id:              string;
  businessName:    string;
  contactName:     string;
  contactEmail:    string;
  contactPhone:    string;
  description:     string;
  status:          "pending" | "approved" | "paid" | "confirmed" | "rejected" | "expired";
  hasPriority:     boolean;
  ownerNote:       string | null;
  marketProfileId: string | null;
  createdAt:       string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INPUT = "w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 text-sm focus:outline-none focus:border-purple-500 transition placeholder-gray-600";
const LABEL = "block text-gray-400 text-xs font-semibold mb-1.5";

const APP_STATUS_STYLE: Record<string, string> = {
  pending:   "bg-amber-900/30 border-amber-700/40 text-amber-400",
  approved:  "bg-blue-900/30 border-blue-700/40 text-blue-400",
  paid:      "bg-indigo-900/30 border-indigo-700/40 text-indigo-400",
  confirmed: "bg-green-900/30 border-green-700/40 text-green-400",
  rejected:  "bg-red-900/30 border-red-700/40 text-red-400",
  expired:   "bg-gray-800 border-gray-700 text-gray-500",
};

const APP_STATUS_ICON: Record<string, React.ReactNode> = {
  pending:   <Clock className="w-3 h-3" />,
  approved:  <CheckCircle className="w-3 h-3" />,
  paid:      <Wallet className="w-3 h-3" />,
  confirmed: <BadgeCheck className="w-3 h-3" />,
  rejected:  <XCircle className="w-3 h-3" />,
  expired:   <XCircle className="w-3 h-3" />,
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${APP_STATUS_STYLE[status] ?? ""}`}>
      {APP_STATUS_ICON[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Slot Form ────────────────────────────────────────────────────────────────

function SlotForm({ eventId, initial, onSaved, onCancel }: {
  eventId:  number;
  initial?: Partial<VendingSlot>;
  onSaved:  () => void;
  onCancel: () => void;
}) {
  const [title,       setTitle]       = useState(initial?.title       ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price,       setPrice]       = useState(String(initial?.price ?? ""));
  const [totalSlots,  setTotalSlots]  = useState(String(initial?.totalSlots ?? "1"));
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");

  async function submit() {
    setError("");
    if (!title.trim())                    { setError("Title is required.");                    return; }
    if (!price || Number(price) <= 0)     { setError("Price must be greater than 0.");         return; }
    if (!totalSlots || Number(totalSlots) < 1) { setError("Must have at least 1 slot.");      return; }

    setSaving(true);
    try {
      const isEdit = !!initial?.id;
      const res = await fetch("/api/vending/slots", {
        method:  isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEdit ? { slotId: initial!.id } : { eventId }),
          title:       title.trim(),
          description: description.trim() || null,
          price:       Number(price),
          currency:    "KES",
          totalSlots:  Number(totalSlots),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to save slot."); return; }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 flex flex-col gap-4">
      <h3 className="text-gray-200 font-bold text-sm">
        {initial?.id ? "Edit Slot" : "Create Vending Slot"}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={LABEL}>Slot Title *</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Food & Beverage Stand, Merchandise Table" className={INPUT} />
        </div>
        <div className="sm:col-span-2">
          <label className={LABEL}>Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            rows={2} placeholder="What will vendors in this slot be doing / selling?"
            className={INPUT + " resize-none"} />
        </div>
        <div>
          <label className={LABEL}>Price (KES) *</label>
          <input type="number" value={price} onChange={e => setPrice(e.target.value)}
            placeholder="e.g. 5000" className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Number of Spots *</label>
          <input type="number" value={totalSlots} onChange={e => setTotalSlots(e.target.value)}
            placeholder="e.g. 3" min="1" className={INPUT} />
          <p className="text-gray-600 text-xs mt-1">How many vendors can book this slot type</p>
        </div>
      </div>
      {error && (
        <div className="flex items-center gap-2 bg-red-900/20 border border-red-700/30 rounded-xl px-4 py-3 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      <div className="flex gap-3">
        <button onClick={submit} disabled={saving}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          {initial?.id ? "Save Changes" : "Create Slot"}
        </button>
        <button onClick={onCancel}
          className="px-5 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-gray-200 text-sm transition">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Application Card ─────────────────────────────────────────────────────────

function AppCard({ app, onDecision }: {
  app:        SlotApplication;
  onDecision: (id: string, action: "approve" | "reject", note: string) => Promise<void>;
}) {
  const [open,   setOpen]   = useState(false);
  const [note,   setNote]   = useState(app.ownerNote ?? "");
  const [saving, setSaving] = useState<"approve" | "reject" | null>(null);

  const decide = async (action: "approve" | "reject") => {
    setSaving(action);
    await onDecision(app.id, action, note);
    setSaving(null);
  };

  return (
    <div className={`border rounded-xl overflow-hidden bg-gray-950 ${open ? "border-gray-700" : "border-gray-800"}`}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-800/30 transition">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-gray-200 font-semibold text-sm">{app.businessName}</p>
            {app.hasPriority && (
              <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-900/40 border border-amber-700/40 text-amber-400 font-semibold">
                <Star className="w-3 h-3 fill-amber-400" /> Marketplace
              </span>
            )}
          </div>
          <p className="text-gray-500 text-xs mt-0.5">{app.contactName} · {app.contactPhone}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={app.status} />
          {open ? <ChevronUp className="w-4 h-4 text-gray-600" /> : <ChevronDown className="w-4 h-4 text-gray-600" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-800 p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-gray-900 rounded-xl p-3">
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Contact</p>
              <p className="text-gray-300 text-sm">{app.contactName}</p>
              <p className="text-gray-400 text-xs">{app.contactEmail}</p>
              <p className="text-gray-400 text-xs">{app.contactPhone}</p>
            </div>
            <div className="bg-gray-900 rounded-xl p-3">
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Applied</p>
              <p className="text-gray-300 text-sm">
                {new Date(app.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
              </p>
              {app.marketProfileId && (
                <Link href={`/marketplace/${app.marketProfileId}`} target="_blank"
                  className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-xs mt-1 transition">
                  <ExternalLink className="w-3 h-3" /> View marketplace profile
                </Link>
              )}
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-3">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">Their Message</p>
            <p className="text-gray-300 text-sm leading-relaxed">{app.description}</p>
          </div>

          {app.status === "paid" && (
            <div className="flex items-center gap-2 bg-indigo-900/20 border border-indigo-700/30 rounded-xl px-4 py-3 text-indigo-300 text-sm">
              <Wallet className="w-4 h-4 shrink-0" />
              Payment initiated — waiting for M-Pesa confirmation via webhook
            </div>
          )}
          {app.status === "confirmed" && (
            <div className="flex items-center gap-2 bg-green-900/20 border border-green-700/30 rounded-xl px-4 py-3 text-green-300 text-sm">
              <BadgeCheck className="w-4 h-4 shrink-0" />
              Payment confirmed — slot booked. Earnings credited to your wallet.
            </div>
          )}

          {/* Decision buttons — show for pending, approved, rejected but not paid/confirmed */}
          {!["paid", "confirmed"].includes(app.status) && (
            <div className="space-y-3 pt-2 border-t border-gray-800">
              <div>
                <label className={LABEL}>Note to vendor (optional)</label>
                <textarea value={note} onChange={e => setNote(e.target.value)}
                  rows={2} placeholder="Add context about your decision…"
                  className={INPUT + " resize-none"} />
              </div>
              <div className="flex gap-3 flex-wrap">
                {app.status !== "approved" && (
                  <button onClick={() => decide("approve")} disabled={!!saving}
                    className="flex items-center gap-2 bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition">
                    {saving === "approve" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    {app.status === "rejected" ? "Approve Instead" : "Approve"}
                  </button>
                )}
                {app.status !== "rejected" && (
                  <button onClick={() => decide("reject")} disabled={!!saving}
                    className="flex items-center gap-2 bg-red-900/40 hover:bg-red-800 border border-red-700/40 disabled:opacity-40 text-red-300 font-bold px-5 py-2.5 rounded-xl text-sm transition">
                    {saving === "reject" ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    {app.status === "approved" ? "Revoke Approval" : "Decline"}
                  </button>
                )}
              </div>
              {app.status === "approved" && (
                <p className="text-blue-400 text-xs">
                  ✓ Approved — vendor will see a Pay via M-Pesa button on the event page.
                </p>
              )}
            </div>
          )}

          {app.ownerNote && !["pending"].includes(app.status) && (
            <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
              <p className="text-gray-500 text-xs font-semibold mb-1">Your note:</p>
              <p className="text-gray-300 text-sm">{app.ownerNote}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Slot Card ────────────────────────────────────────────────────────────────

function SlotCard({ slot, eventId, onRefresh }: {
  slot:      VendingSlot;
  eventId:   number;
  onRefresh: () => void;
}) {
  const vendingUrl = typeof window !== "undefined"
    ? `${window.location.origin}/events/${eventId}/vending`
    : `/events/${eventId}/vending`;
  const [open,       setOpen]       = useState(false);
  const [editing,    setEditing]    = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const [toggling,   setToggling]   = useState(false);
  const [appFilter,  setAppFilter]  = useState<"all"|"pending"|"approved"|"confirmed">("all");

  const pending   = slot.applications.filter(a => a.status === "pending").length;
  const confirmed = slot.applications.filter(a => a.status === "confirmed").length;
  const spotsLeft = slot.totalSlots - slot.bookedCount;

  const handleToggle = async () => {
    setToggling(true);
    await fetch("/api/vending/slots", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ slotId: slot.id, status: slot.status === "open" ? "closed" : "open" }),
    });
    setToggling(false);
    onRefresh();
  };

  const handleDelete = async () => {
    if (!confirming) { setConfirming(true); return; }
    setDeleting(true);
    await fetch("/api/vending/slots", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ slotId: slot.id }),
    });
    setDeleting(false);
    setConfirming(false);
    onRefresh();
  };

  const handleDecision = async (appId: string, action: "approve" | "reject", note: string) => {
    await fetch("/api/vending/applications", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ applicationId: appId, action, ownerNote: note }),
    });
    onRefresh();
  };

  const filteredApps = slot.applications.filter(a =>
    appFilter === "all" ? true : a.status === appFilter
  );

  if (editing) {
    return (
      <SlotForm
        eventId={eventId}
        initial={slot}
        onSaved={() => { setEditing(false); onRefresh(); }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className={`border rounded-2xl overflow-hidden ${slot.status === "closed" ? "border-gray-800 opacity-70" : "border-gray-700"} bg-gray-900`}>
      <div className="p-4 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-gray-200 font-bold text-sm">{slot.title}</h4>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${
              slot.status === "open"
                ? "bg-green-900/30 border-green-700/40 text-green-400"
                : "bg-gray-800 border-gray-700 text-gray-500"
            }`}>
              {slot.status === "open" ? "Open" : "Closed"}
            </span>
            {pending > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/30 border border-amber-700/40 text-amber-400 font-semibold">
                {pending} pending
              </span>
            )}
          </div>
          {slot.description && (
            <p className="text-gray-500 text-xs mt-1 line-clamp-1">{slot.description}</p>
          )}
          <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-400">
            <span className="text-green-400 font-bold">KES {slot.price.toLocaleString()}</span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {confirmed}/{slot.totalSlots} booked · {spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left
            </span>
          </div>
          {/* Share link for this slot */}
          <div className="flex items-center gap-2 mt-2">
            <p className="text-gray-500 text-xs truncate flex-1 font-mono">{vendingUrl}</p>
            <CopyLinkButton url={vendingUrl} label="Copy" />
            <ShareSlotButton
              url={vendingUrl}
              title={`Vending slots — ${slot.title}`}
              text={`Apply for a vending slot (${slot.title}) at this event:`}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button onClick={handleToggle} disabled={toggling} title={slot.status === "open" ? "Close slot" : "Open slot"}
            className="text-gray-500 hover:text-gray-300 transition">
            {toggling ? <Loader2 className="w-4 h-4 animate-spin" />
              : slot.status === "open" ? <ToggleRight className="w-5 h-5 text-green-400" />
              : <ToggleLeft className="w-5 h-5" />}
          </button>
          <button onClick={() => setEditing(true)} className="text-gray-500 hover:text-gray-300 transition">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className={`transition ${confirming ? "text-red-400" : "text-gray-500 hover:text-red-400"}`}>
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
          {confirming && (
            <button onClick={() => setConfirming(false)} className="text-xs text-gray-500 hover:text-gray-300">cancel</button>
          )}
          <button onClick={() => setOpen(o => !o)} className="text-gray-500 hover:text-gray-300 transition ml-1">
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-gray-800 p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
              Applications ({slot.applications.length})
            </p>
            {slot.applications.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {(["all","pending","approved","confirmed"] as const).map(f => (
                  <button key={f} onClick={() => setAppFilter(f)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                      appFilter === f ? "bg-gray-700 text-gray-100" : "text-gray-600 hover:text-gray-400"
                    }`}>
                    {f.charAt(0).toUpperCase() + f.slice(1)} ({f === "all" ? slot.applications.length : slot.applications.filter(a => a.status === f).length})
                  </button>
                ))}
              </div>
            )}
          </div>

          {slot.applications.length === 0 ? (
            <div className="text-center py-8 text-gray-600 text-sm">
              No applications yet — share the vendor page link with potential vendors.
            </div>
          ) : filteredApps.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-4">No {appFilter} applications.</p>
          ) : (
            <div className="space-y-2">
              {filteredApps.map(app => (
                <AppCard key={app.id} app={app} onDecision={handleDecision} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export default function VendorsPanel({ eventId }: { eventId: number }) {
  const [slots,    setSlots]    = useState<VendingSlot[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/vending/slots?eventId=${eventId}`);
      const data = await res.json();
      setSlots(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  const totalEarned  = slots.reduce((s, sl) => s + sl.bookedCount * sl.price, 0);
  const totalPending = slots.reduce((s, sl) => s + sl.applications.filter(a => a.status === "pending").length, 0);

  if (loading) return (
    <div className="flex justify-center py-12">
      <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-gray-200 font-bold flex items-center gap-2">
            <Store className="w-4 h-4 text-purple-400" /> Vending Slots
          </h3>
          <p className="text-gray-500 text-xs mt-0.5">
            Create slots · vendors apply and pay via M-Pesa · earnings go to your wallet
          </p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition">
          <Plus className="w-4 h-4" /> Add Slot
        </button>
      </div>

      {/* Stats */}
      {slots.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <p className="text-gray-200 font-bold text-lg">{slots.length}</p>
            <p className="text-gray-500 text-xs">Slot Types</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <p className="text-amber-400 font-bold text-lg">{totalPending}</p>
            <p className="text-gray-500 text-xs">Pending Review</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <p className="text-green-400 font-bold text-sm">KES {totalEarned.toLocaleString()}</p>
            <p className="text-gray-500 text-xs">Confirmed Revenue</p>
          </div>
        </div>
      )}

      {/* Wallet link */}
      {totalEarned > 0 && (
        <Link href="/vending/wallet"
          className="flex items-center gap-2 bg-purple-900/20 border border-purple-700/30 rounded-xl px-4 py-3 text-purple-300 text-sm hover:bg-purple-900/30 transition">
          <Wallet className="w-4 h-4" />
          View your wallet & withdraw earnings →
        </Link>
      )}

      {/* Vendor page link */}
      {slots.length > 0 && (
        <Link href={`/events/${eventId}/vending`} target="_blank"
          className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-gray-400 text-sm hover:border-gray-600 hover:text-gray-200 transition">
          <ExternalLink className="w-4 h-4" />
          Open vendor application page — share this link with vendors →
        </Link>
      )}

      {/* Create form */}
      {showForm && (
        <SlotForm
          eventId={eventId}
          onSaved={() => { setShowForm(false); fetchSlots(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Slot list */}
      {slots.length === 0 && !showForm ? (
        <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded-2xl">
          <Store className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 font-semibold mb-1">No vending slots yet</p>
          <p className="text-gray-600 text-sm mb-4">
            Create slots that vendors can apply and pay for.
            <br />They'll appear on your event's public vending page.
          </p>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition mx-auto">
            <Plus className="w-4 h-4" /> Create First Slot
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {slots.map(slot => (
            <SlotCard key={slot.id} slot={slot} eventId={eventId} onRefresh={fetchSlots} />
          ))}
        </div>
      )}
    </div>
  );
}