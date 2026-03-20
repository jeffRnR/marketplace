"use client";
// app/events/[id]/manage-vending/page.tsx
// Event owner only.
// Left panel: list + create/edit/delete slots.
// Right panel: applications for the selected slot, sorted by priority.

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Loader2, Plus, Pencil, Trash2, CheckCircle, XCircle,
  ArrowLeft, ShoppingBag, Users, BadgeCheck, ChevronRight,
  AlertTriangle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Slot {
  id:           string;
  title:        string;
  description:  string;
  price:        number;
  currency:     string;
  status:       string;
  totalSlots:   number;
  bookedCount:  number;
  availability: string;
}

interface Application {
  id:             string;
  businessName:   string;
  contactName:    string;
  contactEmail:   string;
  contactPhone:   string;
  description:    string;
  hasPriority:    boolean;
  status:         string;
  ownerNote:      string | null;
  createdAt:      string;
}

type ModalMode = "none" | "create" | "edit";

const INPUT = "w-full bg-gray-800 text-gray-300 rounded-xl border border-gray-700 px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition placeholder-gray-600";

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:   "bg-yellow-900/40 text-yellow-400 border-yellow-700/40",
    approved:  "bg-blue-900/40 text-blue-400 border-blue-700/40",
    rejected:  "bg-red-900/40 text-red-400 border-red-700/40",
    paid:      "bg-orange-900/40 text-orange-400 border-orange-700/40",
    confirmed: "bg-green-900/40 text-green-400 border-green-700/40",
    expired:   "bg-gray-800 text-gray-500 border-gray-700",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${map[status] ?? "bg-gray-800 text-gray-400 border-gray-700"}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ManageVendingPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const router          = useRouter();
  const { data: session, status: authStatus } = useSession();

  const [slots,          setSlots]          = useState<Slot[]>([]);
  const [selectedSlot,   setSelectedSlot]   = useState<Slot | null>(null);
  const [applications,   setApplications]   = useState<Application[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [appsLoading,    setAppsLoading]    = useState(false);
  const [actionLoading,  setActionLoading]  = useState<string | null>(null);
  const [error,          setError]          = useState("");

  // Slot modal
  const [modal,         setModal]         = useState<ModalMode>("none");
  const [modalLoading,  setModalLoading]  = useState(false);
  const [modalError,    setModalError]    = useState("");
  const [form, setForm] = useState({ title: "", description: "", price: "", totalSlots: "", currency: "KES" });

  // Approve/reject note
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/auth/signin");
  }, [authStatus]);

  // ── Load slots ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/vending/slots?eventId=${eventId}`);
        if (res.ok) setSlots(await res.json());
      } finally {
        setLoading(false);
      }
    }
    if (authStatus === "authenticated") load();
  }, [eventId, authStatus]);

  // ── Load applications when slot selected ──────────────────────────────────
  async function loadApplications(slotId: string) {
    setAppsLoading(true);
    try {
      const res = await fetch(`/api/vending/applications?slotId=${slotId}`);
      if (res.ok) setApplications(await res.json());
    } finally {
      setAppsLoading(false);
    }
  }

  function selectSlot(slot: Slot) {
    setSelectedSlot(slot);
    setApplications([]);
    loadApplications(slot.id);
  }

  // ── Create / edit slot ────────────────────────────────────────────────────
  function openCreate() {
    setForm({ title: "", description: "", price: "", totalSlots: "", currency: "KES" });
    setModalError("");
    setModal("create");
  }

  function openEdit(slot: Slot) {
    setForm({
      title:       slot.title,
      description: slot.description,
      price:       String(slot.price),
      totalSlots:  String(slot.totalSlots),
      currency:    slot.currency,
    });
    setModalError("");
    setModal("edit");
  }

  async function saveSlot() {
    if (!form.title.trim() || !form.description.trim() || !form.price || !form.totalSlots) {
      setModalError("All fields are required."); return;
    }
    setModalLoading(true); setModalError("");
    try {
      if (modal === "create") {
        const res  = await fetch("/api/vending/slots", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ eventId: Number(eventId), ...form, price: Number(form.price), totalSlots: Number(form.totalSlots) }),
        });
        const data = await res.json();
        if (!res.ok) { setModalError(data.error ?? "Failed to create slot."); return; }
        setSlots((prev) => [...prev, { ...data.slot, bookedCount: 0, availability: "available" }]);
      } else if (modal === "edit" && selectedSlot) {
        const res  = await fetch("/api/vending/slots", {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ slotId: selectedSlot.id, ...form, price: Number(form.price), totalSlots: Number(form.totalSlots) }),
        });
        const data = await res.json();
        if (!res.ok) { setModalError(data.error ?? "Failed to update slot."); return; }
        setSlots((prev) => prev.map((s) => s.id === selectedSlot.id ? { ...s, ...data.slot } : s));
        setSelectedSlot((prev) => prev ? { ...prev, ...data.slot } : prev);
      }
      setModal("none");
    } finally {
      setModalLoading(false);
    }
  }

  async function deleteSlot(slotId: string) {
    if (!confirm("Delete this slot? All pending applications will also be removed.")) return;
    const res = await fetch(`/api/vending/slots?slotId=${slotId}`, { method: "DELETE" });
    if (res.ok) {
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
      if (selectedSlot?.id === slotId) { setSelectedSlot(null); setApplications([]); }
    }
  }

  // ── Approve / reject ──────────────────────────────────────────────────────
  async function handleAction(applicationId: string, action: "approve" | "reject") {
    setActionLoading(applicationId);
    setError("");
    try {
      const res  = await fetch("/api/vending/applications", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ applicationId, action, ownerNote: noteMap[applicationId] ?? null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? `Failed to ${action} application.`); return; }
      setApplications((prev) =>
        prev.map((a) => a.id === applicationId ? { ...a, status: data.application.status, ownerNote: data.application.ownerNote } : a)
      );
    } finally {
      setActionLoading(null);
    }
  }

  // ── Toggle slot open/closed ───────────────────────────────────────────────
  async function toggleSlotStatus(slot: Slot) {
    const newStatus = slot.status === "open" ? "closed" : "open";
    const res = await fetch("/api/vending/slots", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ slotId: slot.id, status: newStatus }),
    });
    if (res.ok) {
      setSlots((prev) => prev.map((s) => s.id === slot.id ? { ...s, status: newStatus } : s));
      if (selectedSlot?.id === slot.id) setSelectedSlot((prev) => prev ? { ...prev, status: newStatus } : prev);
    }
  }

  if (loading || authStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/events/${eventId}`} className="text-gray-500 hover:text-gray-300 transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
                <ShoppingBag className="w-6 h-6 text-purple-400" /> Manage Vending
              </h1>
              <p className="text-gray-500 text-sm">Create slots and review applications.</p>
            </div>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold transition">
            <Plus className="w-4 h-4" /> New Slot
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-900/20 border border-red-700/40 rounded-xl px-4 py-3 text-red-300 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-5 gap-5">

          {/* ── Slots list ─────────────────────────────────────────────── */}
          <div className="md:col-span-2 flex flex-col gap-3">
            {slots.length === 0 ? (
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 text-center flex flex-col items-center gap-3">
                <ShoppingBag className="w-8 h-8 text-gray-600" />
                <p className="text-gray-500 text-sm">No slots yet.</p>
                <button onClick={openCreate}
                  className="text-purple-400 hover:text-purple-300 text-sm font-medium transition">
                  Create your first slot →
                </button>
              </div>
            ) : slots.map((slot) => (
              <div key={slot.id}
                onClick={() => selectSlot(slot)}
                className={`bg-gray-900 border rounded-2xl p-4 cursor-pointer transition ${selectedSlot?.id === slot.id ? "border-purple-500 ring-1 ring-purple-500/30" : "border-gray-700 hover:border-gray-500"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-100 font-semibold text-sm truncate">{slot.title}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      KES {slot.price.toLocaleString()} · {slot.bookedCount}/{slot.totalSlots} booked
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${slot.status === "open" ? "bg-emerald-900/40 text-emerald-400 border-emerald-700/40" : "bg-gray-800 text-gray-500 border-gray-700"}`}>
                      {slot.status}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => openEdit(slot)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition">
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <button onClick={() => toggleSlotStatus(slot)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition">
                    {slot.status === "open" ? <XCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                    {slot.status === "open" ? "Close" : "Open"}
                  </button>
                  <button onClick={() => deleteSlot(slot.id)}
                    className="flex items-center gap-1 text-xs text-red-600 hover:text-red-400 transition ml-auto">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ── Applications panel ──────────────────────────────────────── */}
          <div className="md:col-span-3">
            {!selectedSlot ? (
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-10 text-center flex flex-col items-center gap-3 h-full">
                <Users className="w-8 h-8 text-gray-600" />
                <p className="text-gray-500 text-sm">Select a slot to view applications.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-gray-200 font-semibold">{selectedSlot.title}</h2>
                  <p className="text-gray-500 text-xs">{applications.length} application{applications.length !== 1 ? "s" : ""}</p>
                </div>

                {appsLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                  </div>
                ) : applications.length === 0 ? (
                  <div className="bg-gray-900 border border-gray-700 rounded-2xl p-10 text-center">
                    <p className="text-gray-500 text-sm">No applications yet.</p>
                  </div>
                ) : (
                  applications.map((app) => (
                    <div key={app.id} className="bg-gray-900 border border-gray-700 rounded-2xl p-5 flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-gray-100 font-semibold text-sm">{app.businessName}</p>
                            {app.hasPriority && (
                              <span className="flex items-center gap-1 text-xs bg-amber-900/30 text-amber-400 border border-amber-700/40 px-2 py-0.5 rounded-full">
                                <BadgeCheck className="w-3 h-3" /> Priority
                              </span>
                            )}
                          </div>
                          <p className="text-gray-500 text-xs mt-0.5">{app.contactName} · {app.contactEmail} · {app.contactPhone}</p>
                        </div>
                        <StatusBadge status={app.status} />
                      </div>

                      <p className="text-gray-400 text-sm bg-gray-800 rounded-xl px-4 py-3">
                        {app.description}
                      </p>

                      {app.ownerNote && (
                        <p className="text-gray-500 text-xs italic">Note: {app.ownerNote}</p>
                      )}

                      {/* Approve/reject actions — only for pending */}
                      {app.status === "pending" && (
                        <div className="flex flex-col gap-2">
                          <textarea
                            rows={2}
                            placeholder="Optional note to applicant…"
                            value={noteMap[app.id] ?? ""}
                            onChange={(e) => setNoteMap((prev) => ({ ...prev, [app.id]: e.target.value }))}
                            className={INPUT + " resize-none text-xs"}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAction(app.id, "approve")}
                              disabled={actionLoading === app.id}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white text-xs font-semibold transition"
                            >
                              {actionLoading === app.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                              Approve
                            </button>
                            <button
                              onClick={() => handleAction(app.id, "reject")}
                              disabled={actionLoading === app.id}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-800 hover:bg-red-900/40 border border-gray-700 hover:border-red-700/40 disabled:opacity-40 text-gray-400 hover:text-red-400 text-xs font-semibold transition"
                            >
                              {actionLoading === app.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                              Reject
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Create / Edit Modal ──────────────────────────────────────────────── */}
      {modal !== "none" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl p-6 flex flex-col gap-4">
            <h2 className="text-gray-100 font-bold text-lg">{modal === "create" ? "New Vending Slot" : "Edit Slot"}</h2>
            {[
              { label: "Title",          key: "title",       ph: "Food & Beverages" },
              { label: "Description",    key: "description", ph: "Snacks, drinks, grilled items…" },
              { label: "Price (KES)",    key: "price",       ph: "5000" },
              { label: "Total Slots",    key: "totalSlots",  ph: "3" },
            ].map(({ label, key, ph }) => (
              <div key={key} className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">{label} *</label>
                <input
                  type={key === "price" || key === "totalSlots" ? "number" : "text"}
                  placeholder={ph}
                  value={(form as any)[key]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                  className={INPUT}
                />
              </div>
            ))}

            {modalError && (
              <p className="text-red-400 text-xs flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> {modalError}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button onClick={() => setModal("none")}
                className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 hover:text-gray-200 text-sm font-medium transition">
                Cancel
              </button>
              <button onClick={saveSlot} disabled={modalLoading}
                className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold transition flex items-center justify-center gap-2">
                {modalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (modal === "create" ? "Create Slot" : "Save Changes")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}