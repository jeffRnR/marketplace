"use client";
// app/events/[id]/manage-vending/page.tsx

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Loader2, Plus, Pencil, Trash2, CheckCircle, XCircle,
  ArrowLeft, ShoppingBag, Users, BadgeCheck, ChevronRight,
  AlertTriangle,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

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
  id:           string;
  businessName: string;
  contactName:  string;
  contactEmail: string;
  contactPhone: string;
  description:  string;
  hasPriority:  boolean;
  status:       string;
  ownerNote:    string | null;
  createdAt:    string;
}

type ModalMode = "none" | "create" | "edit";

const INPUT =
  "w-full rounded-xl border border-[var(--brand-purple)]/25 bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--brand-purple)] focus:ring-2 focus:ring-[var(--brand-purple)]/10";

// ─── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:   "bg-yellow-900/30 text-yellow-400 border-yellow-700/40",
    approved:  "bg-blue-900/30 text-blue-400 border-blue-700/40",
    rejected:  "bg-red-900/30 text-red-400 border-red-700/40",
    paid:      "bg-orange-900/30 text-orange-400 border-orange-700/40",
    confirmed: "bg-emerald-900/30 text-emerald-400 border-emerald-700/40",
    expired:   "border-[var(--brand-purple)]/20 text-[var(--muted)]",
  };
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${map[status] ?? "border-[var(--brand-purple)]/20 text-[var(--muted)]"}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────

export default function ManageVendingPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();

  const [slots,         setSlots]         = useState<Slot[]>([]);
  const [selectedSlot,  setSelectedSlot]  = useState<Slot | null>(null);
  const [applications,  setApplications]  = useState<Application[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [appsLoading,   setAppsLoading]   = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error,         setError]         = useState("");

  const [modal,        setModal]        = useState<ModalMode>("none");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError,   setModalError]   = useState("");
  const [form, setForm] = useState({
    title: "", description: "", price: "", totalSlots: "", currency: "KES",
  });

  const [noteMap, setNoteMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/auth/signin");
  }, [authStatus]);

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
        const res = await fetch("/api/vending/slots", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ eventId, ...form, price: Number(form.price), totalSlots: Number(form.totalSlots) }),
        });
        const data = await res.json();
        if (!res.ok) { setModalError(data.error ?? "Failed to create slot."); return; }
        setSlots(prev => [...prev, { ...data.slot, bookedCount: 0, availability: "available" }]);
      } else if (modal === "edit" && selectedSlot) {
        const res = await fetch("/api/vending/slots", {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ slotId: selectedSlot.id, ...form, price: Number(form.price), totalSlots: Number(form.totalSlots) }),
        });
        const data = await res.json();
        if (!res.ok) { setModalError(data.error ?? "Failed to update slot."); return; }
        setSlots(prev => prev.map(s => s.id === selectedSlot.id ? { ...s, ...data.slot } : s));
        setSelectedSlot(prev => prev ? { ...prev, ...data.slot } : prev);
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
      setSlots(prev => prev.filter(s => s.id !== slotId));
      if (selectedSlot?.id === slotId) { setSelectedSlot(null); setApplications([]); }
    }
  }

  async function handleAction(applicationId: string, action: "approve" | "reject") {
    setActionLoading(applicationId); setError("");
    try {
      const res = await fetch("/api/vending/applications", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ applicationId, action, ownerNote: noteMap[applicationId] ?? null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? `Failed to ${action} application.`); return; }
      setApplications(prev =>
        prev.map(a => a.id === applicationId ? { ...a, status: data.application.status, ownerNote: data.application.ownerNote } : a)
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function toggleSlotStatus(slot: Slot) {
    const newStatus = slot.status === "open" ? "closed" : "open";
    const res = await fetch("/api/vending/slots", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ slotId: slot.id, status: newStatus }),
    });
    if (res.ok) {
      setSlots(prev => prev.map(s => s.id === slot.id ? { ...s, status: newStatus } : s));
      if (selectedSlot?.id === slot.id) setSelectedSlot(prev => prev ? { ...prev, status: newStatus } : prev);
    }
  }

  if (loading || authStatus === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--brand-purple)]" />
      </div>
    );
  }

  return (
    <div className="page-reveal min-h-screen w-full bg-[var(--background)] px-4 pb-20 pt-4 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/events/${eventId}`}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--brand-purple)]/25 bg-[var(--surface)] text-[var(--muted)] transition hover:border-[var(--brand-purple)]/50 hover:text-[var(--foreground)]"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand-green)]">
                Event management
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                Manage Vending
              </h1>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-purple-600 px-4 text-sm font-bold text-white transition hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" /> New Slot
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-5">

          {/* ── Slots list ──────────────────────────────────────────────── */}
          <div className="flex flex-col gap-3 md:col-span-2">
            {slots.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--brand-purple)]/45 bg-[var(--surface)] px-6 py-16 text-center">
                <ShoppingBag className="h-8 w-8 text-[var(--muted)]" />
                <p className="text-sm text-[var(--muted)]">No slots yet.</p>
                <button
                  onClick={openCreate}
                  className="text-sm font-semibold text-[var(--brand-purple)] transition hover:text-[var(--foreground)]"
                >
                  Create your first slot
                </button>
              </div>
            ) : slots.map(slot => (
              <div
                key={slot.id}
                onClick={() => selectSlot(slot)}
                className={`cursor-pointer rounded-xl border bg-[var(--surface)] p-4 transition duration-200 ${
                  selectedSlot?.id === slot.id
                    ? "border-[var(--brand-purple)] ring-1 ring-[var(--brand-purple)]/20"
                    : "border-[var(--brand-purple)]/25 hover:border-[var(--brand-purple)]/60"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                      {slot.title}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                      KES {slot.price.toLocaleString()} · {slot.bookedCount}/{slot.totalSlots} booked
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                      slot.status === "open"
                        ? "border-emerald-700/40 bg-emerald-900/30 text-emerald-400"
                        : "border-[var(--brand-purple)]/20 text-[var(--muted)]"
                    }`}>
                      {slot.status}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-[var(--muted)]" />
                  </div>
                </div>
                <div
                  className="mt-3 flex items-center gap-3 border-t border-[var(--brand-purple)]/10 pt-3"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={() => openEdit(slot)}
                    className="flex items-center gap-1 text-xs text-[var(--muted)] transition hover:text-[var(--foreground)]"
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                  <button
                    onClick={() => toggleSlotStatus(slot)}
                    className="flex items-center gap-1 text-xs text-[var(--muted)] transition hover:text-[var(--foreground)]"
                  >
                    {slot.status === "open"
                      ? <XCircle className="h-3 w-3" />
                      : <CheckCircle className="h-3 w-3" />}
                    {slot.status === "open" ? "Close" : "Open"}
                  </button>
                  <button
                    onClick={() => deleteSlot(slot.id)}
                    className="ml-auto flex items-center gap-1 text-xs text-red-400/70 transition hover:text-red-400"
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ── Applications panel ──────────────────────────────────────── */}
          <div className="md:col-span-3">
            {!selectedSlot ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--brand-purple)]/45 bg-[var(--surface)] p-10 text-center">
                <Users className="h-8 w-8 text-[var(--muted)]" />
                <p className="text-sm text-[var(--muted)]">Select a slot to view applications.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-[var(--foreground)]">{selectedSlot.title}</h2>
                  <p className="text-xs text-[var(--muted)]">
                    {applications.length} application{applications.length !== 1 ? "s" : ""}
                  </p>
                </div>

                {appsLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-5 w-5 animate-spin text-[var(--brand-purple)]" />
                  </div>
                ) : applications.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--brand-purple)]/45 bg-[var(--surface)] p-10 text-center">
                    <p className="text-sm text-[var(--muted)]">No applications yet.</p>
                  </div>
                ) : applications.map(app => (
                  <div
                    key={app.id}
                    className="flex flex-col gap-4 rounded-xl border border-[var(--brand-purple)]/25 bg-[var(--surface)] p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[var(--foreground)]">
                            {app.businessName}
                          </p>
                          {app.hasPriority && (
                            <span className="flex items-center gap-1 rounded-full border border-amber-700/40 bg-amber-900/30 px-2 py-0.5 text-xs text-amber-400">
                              <BadgeCheck className="h-3 w-3" /> Priority
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-[var(--muted)]">
                          {app.contactName} · {app.contactEmail} · {app.contactPhone}
                        </p>
                      </div>
                      <StatusBadge status={app.status} />
                    </div>

                    <p className="rounded-xl border border-[var(--brand-purple)]/15 bg-[var(--background)] px-4 py-3 text-sm text-[var(--muted)]">
                      {app.description}
                    </p>

                    {app.ownerNote && (
                      <p className="text-xs italic text-[var(--muted)]">Note: {app.ownerNote}</p>
                    )}

                    {app.status === "pending" && (
                      <div className="flex flex-col gap-2">
                        <textarea
                          rows={2}
                          placeholder="Optional note to applicant…"
                          value={noteMap[app.id] ?? ""}
                          onChange={e => setNoteMap(prev => ({ ...prev, [app.id]: e.target.value }))}
                          className={INPUT + " resize-none text-xs"}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction(app.id, "approve")}
                            disabled={actionLoading === app.id}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-700 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-40"
                          >
                            {actionLoading === app.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <CheckCircle className="h-3.5 w-3.5" />}
                            Approve
                          </button>
                          <button
                            onClick={() => handleAction(app.id, "reject")}
                            disabled={actionLoading === app.id}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--brand-purple)]/25 bg-[var(--surface)] py-2.5 text-xs font-semibold text-[var(--muted)] transition hover:border-red-700/40 hover:bg-red-900/20 hover:text-red-400 disabled:opacity-40"
                          >
                            {actionLoading === app.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <XCircle className="h-3.5 w-3.5" />}
                            Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal ───────────────────────────────────────────────────────────── */}
      {modal !== "none" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-[var(--brand-purple)]/25 bg-[var(--background)] p-6 shadow-[0_24px_60px_rgba(68,45,112,0.25)]">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              {modal === "create" ? "New Vending Slot" : "Edit Slot"}
            </h2>

            {([
              { label: "Title",       key: "title",       ph: "Food & Beverages" },
              { label: "Description", key: "description", ph: "Snacks, drinks, grilled items…" },
              { label: "Price (KES)", key: "price",       ph: "5000" },
              { label: "Total Slots", key: "totalSlots",  ph: "3" },
            ] as const).map(({ label, key, ph }) => (
              <div key={key} className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--muted)]">{label} *</label>
                <input
                  type={key === "price" || key === "totalSlots" ? "number" : "text"}
                  placeholder={ph}
                  value={(form as any)[key]}
                  onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                  className={INPUT}
                />
              </div>
            ))}

            {modalError && (
              <p className="flex items-center gap-1.5 text-xs text-red-400">
                <AlertTriangle className="h-3.5 w-3.5" /> {modalError}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setModal("none")}
                className="flex-1 rounded-xl border border-[var(--brand-purple)]/25 py-3 text-sm font-medium text-[var(--muted)] transition hover:border-[var(--brand-purple)]/50 hover:text-[var(--foreground)]"
              >
                Cancel
              </button>
              <button
                onClick={saveSlot}
                disabled={modalLoading}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-bold text-white transition hover:bg-purple-700 disabled:opacity-50"
              >
                {modalLoading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : modal === "create" ? "Create Slot" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}