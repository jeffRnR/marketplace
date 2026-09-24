"use client";
// app/my-events/components/TicketsPanel.tsx

import React, { useState } from "react";
import {
  Plus, Trash2, Pencil, Check, X, Loader2, Ticket,
  AlertTriangle, Tag, Calendar, ToggleLeft, ToggleRight, Clock,
} from "lucide-react";
import { ManagedEvent, TicketStat } from "../types";

type SaveState = "idle" | "saving" | "saved" | "error";

interface EditingTicket {
  id:       string | null;
  type:     string;
  price:    string;
  capacity: number;
  startsAt: string;
  endsAt:   string;
  isActive: boolean;
}

const BLANK: Omit<EditingTicket, "id"> = {
  type: "", price: "", capacity: 50, startsAt: "", endsAt: "", isActive: true,
};

const INPUT    = "w-full bg-white/5 border border-gray-400/50 rounded-xl px-3 py-2.5 text-[var(--foreground)] placeholder:text-[var(--muted)] text-sm outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed";
const DT_INPUT = "w-full bg-white/5 border border-gray-400/50 rounded-xl px-3 py-2.5 text-[var(--foreground)] text-sm outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/30 transition [color-scheme:dark]";
const LABEL    = "text-xs text-[var(--muted)] font-medium";

// ── Helpers ───────────────────────────────────────────────────────────────

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 16);
}

function isExpired(endsAt: string | null): boolean {
  if (!endsAt) return false;
  return new Date(endsAt) < new Date();
}

function isNotStarted(startsAt: string | null): boolean {
  if (!startsAt) return false;
  return new Date(startsAt) > new Date();
}

function ticketStatus(t: TicketStat): "active" | "inactive" | "scheduled" | "expired" {
  if (!t.isActive)            return "inactive";
  if (isExpired(t.endsAt))    return "expired";
  if (isNotStarted(t.startsAt)) return "scheduled";
  return "active";
}

const STATUS_STYLES: Record<string, string> = {
  active:    "bg-green-900/30 border-green-700/50 text-green-400",
  inactive:  "bg-white/5 border-gray-400/20 text-[var(--muted)]",
  scheduled: "bg-blue-900/30 border-blue-700/50 text-blue-400",
  expired:   "bg-red-900/20 border-red-700/40 text-red-400",
};

const STATUS_LABEL: Record<string, string> = {
  active:    "Live",
  inactive:  "Off",
  scheduled: "Scheduled",
  expired:   "Expired",
};

// ── Shared form fields ────────────────────────────────────────────────────

function TicketForm({
  editing, setEditing, isRsvp,
}: {
  editing: EditingTicket;
  setEditing: React.Dispatch<React.SetStateAction<EditingTicket | null>>;
  isRsvp: boolean;
}) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <label className={LABEL}>Name *</label>
          <input type="text" placeholder="e.g. Early Bird, VIP"
            value={editing.type}
            onChange={e => setEditing(p => p && ({ ...p, type: e.target.value }))}
            className={INPUT} />
        </div>
        <div className="flex flex-col gap-1">
          <label className={LABEL}>
            Price (KES){isRsvp ? <span className="opacity-50 font-normal"> — RSVP</span> : " *"}
          </label>
          <input type="text" placeholder="1500"
            value={isRsvp ? "Free" : editing.price}
            onChange={e => !isRsvp && setEditing(p => p && ({ ...p, price: e.target.value }))}
            disabled={isRsvp}
            className={INPUT} />
        </div>
        <div className="flex flex-col gap-1">
          <label className={LABEL}>Capacity *</label>
          <input type="number" min={1} placeholder="50"
            value={editing.capacity}
            onChange={e => setEditing(p => p && ({ ...p, capacity: Number(e.target.value) }))}
            className={INPUT} />
        </div>
      </div>

      {/* Date window */}
      <div className="flex flex-col gap-2">
        <label className={`${LABEL} flex items-center gap-1.5`}>
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          Sale window <span className="opacity-50 font-normal">(optional — leave blank for no time limit)</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className={`${LABEL} opacity-60`}>Goes live at</label>
            <input type="datetime-local" value={editing.startsAt}
              onChange={e => setEditing(p => p && ({ ...p, startsAt: e.target.value }))}
              className={DT_INPUT} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={`${LABEL} opacity-60`}>Expires at</label>
            <input type="datetime-local" value={editing.endsAt}
              onChange={e => setEditing(p => p && ({ ...p, endsAt: e.target.value }))}
              className={DT_INPUT} />
          </div>
        </div>
        {editing.startsAt && editing.endsAt && (
          <p className="text-xs text-blue-400 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            On sale {new Date(editing.startsAt).toLocaleString()} → {new Date(editing.endsAt).toLocaleString()}
          </p>
        )}
      </div>

      {/* Active toggle */}
      <div className="flex items-center justify-between bg-white/2 border border-gray-400/20 rounded-xl px-4 py-3">
        <div>
          <p className="text-sm text-[var(--foreground)] font-medium">Ticket visible to attendees</p>
          <p className="text-xs text-[var(--muted)] mt-0.5">Turn off to hide this ticket from the public event page</p>
        </div>
        <button type="button"
          onClick={() => setEditing(p => p && ({ ...p, isActive: !p.isActive }))}
          className="shrink-0"
        >
          {editing.isActive
            ? <ToggleRight className="w-8 h-8 text-green-400" />
            : <ToggleLeft  className="w-8 h-8 text-[var(--muted)]" />
          }
        </button>
      </div>
    </>
  );
}

// ── Component ─────────────────────────────────────────────────────────────

export function TicketsPanel({
  event,
  onTicketsChanged,
}: {
  event: ManagedEvent;
  onTicketsChanged: (tickets: TicketStat[]) => void;
}) {
  const [tickets,   setTickets]   = useState<TicketStat[]>(event.tickets);
  const [editing,   setEditing]   = useState<EditingTicket | null>(null);
  const [deleteId,  setDeleteId]  = useState<string | null>(null);
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const [toggling,  setToggling]  = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMsg,  setErrorMsg]  = useState("");

  const pushTickets = (next: TicketStat[]) => { setTickets(next); onTicketsChanged(next); };

  const openNew  = () => { setEditing({ id: null, ...BLANK }); setErrorMsg(""); setSaveState("idle"); };
  const openEdit = (t: TicketStat) => {
    setEditing({
      id: t.id, type: t.type, price: t.price, capacity: t.capacity,
      startsAt: toDatetimeLocal(t.startsAt), endsAt: toDatetimeLocal(t.endsAt),
      isActive: t.isActive,
    });
    setErrorMsg(""); setSaveState("idle");
  };
  const closeEdit = () => { setEditing(null); setSaveState("idle"); setErrorMsg(""); };

  // ── Save ──────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.type.trim())                              { setErrorMsg("Ticket name is required.");      return; }
    if (!editing.price.trim() && !event.stats.isRsvp)     { setErrorMsg("Price is required.");            return; }
    if (editing.capacity < 1)                             { setErrorMsg("Capacity must be at least 1."); return; }
    if (editing.startsAt && editing.endsAt && new Date(editing.startsAt) >= new Date(editing.endsAt)) {
      setErrorMsg("End date must be after start date."); return;
    }

    setSaveState("saving"); setErrorMsg("");

    try {
      const isNew = editing.id === null;
      const body  = isNew
        ? { eventId: event.id, type: editing.type, price: event.stats.isRsvp ? "Free" : editing.price, capacity: editing.capacity, isActive: editing.isActive, startsAt: editing.startsAt || null, endsAt: editing.endsAt || null }
        : { ticketId: editing.id, type: editing.type, price: event.stats.isRsvp ? "Free" : editing.price, capacity: editing.capacity, isActive: editing.isActive, startsAt: editing.startsAt || null, endsAt: editing.endsAt || null };

      const res  = await fetch("/api/tickets", {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");

      const saved: TicketStat = {
        id: data.ticket.id, type: data.ticket.type, price: data.ticket.price,
        link: data.ticket.link, isActive: data.ticket.isActive,
        startsAt: data.ticket.startsAt ?? null, endsAt: data.ticket.endsAt ?? null,
        capacity: (() => {
          const m = data.ticket.link?.match(/^capacity:(\d+)$/);
          return m ? parseInt(m[1]) : editing.capacity;
        })(),
      };

      pushTickets(isNew ? [...tickets, saved] : tickets.map(t => t.id === saved.id ? saved : t));
      setSaveState("saved");
      setTimeout(closeEdit, 700);
    } catch (err: any) {
      setErrorMsg(err.message ?? "Something went wrong.");
      setSaveState("error");
    }
  };

  // ── Toggle ────────────────────────────────────────────────────────────

  const handleToggle = async (t: TicketStat) => {
    setToggling(t.id);
    try {
      const res = await fetch("/api/tickets", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: t.id, isActive: !t.isActive }),
      });
      if (!res.ok) throw new Error();
      pushTickets(tickets.map(x => x.id === t.id ? { ...x, isActive: !x.isActive } : x));
    } catch { /* silent */ }
    finally { setToggling(null); }
  };

  // ── Delete ────────────────────────────────────────────────────────────

  const handleDelete = async (ticketId: string) => {
    if (deleteId !== ticketId) { setDeleteId(ticketId); return; }
    setDeleting(ticketId);
    try {
      const res = await fetch(`/api/tickets?ticketId=${ticketId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      pushTickets(tickets.filter(t => t.id !== ticketId));
    } catch { /* silent */ }
    finally { setDeleting(null); setDeleteId(null); }
  };

  const totalCapacity = tickets.reduce((s, t) => s + t.capacity, 0);
  const liveCount     = tickets.filter(t => ticketStatus(t) === "active").length;

  const SaveBtn = ({ disabled }: { disabled?: boolean }) => (
    <button
      onClick={handleSave}
      disabled={disabled || saveState === "saving" || saveState === "saved"}
      className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl border transition duration-300 ${
        saveState === "saved"  ? "bg-green-900/20 border-green-700/40 text-green-400"
        : saveState === "error" ? "bg-red-900/20 border-red-800/50 text-red-400"
        : "bg-purple-600 border-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
      }`}
    >
      {saveState === "saving" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {saveState === "saved"  && <Check   className="w-3.5 h-3.5" />}
      {saveState === "saved" ? "Saved!" : saveState === "saving" ? "Saving..." : "Save ticket"}
    </button>
  );

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[var(--foreground)] font-semibold text-sm">
            {tickets.length} ticket type{tickets.length !== 1 ? "s" : ""}
            <span className="text-[var(--muted)] font-normal"> · </span>
            <span className="text-[var(--brand-green)]">{liveCount} live</span>
            <span className="text-[var(--muted)] font-normal"> · {totalCapacity} total spots</span>
          </p>
          <p className="text-[var(--muted)] text-xs mt-0.5">
            Toggle tickets on/off or set a date window — only live tickets are shown to attendees.
          </p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-gray-400/50 text-[var(--muted)] hover:border-purple-600 hover:text-purple-600 transition duration-300">
          <Plus className="w-3.5 h-3.5" /> New Ticket
        </button>
      </div>

      {/* Empty state */}
      {tickets.length === 0 && !editing && (
        <div className="flex flex-col items-center justify-center py-12 text-[var(--muted)] gap-3 border border-dashed border-gray-400/30 rounded-2xl">
          <Ticket className="w-8 h-8 opacity-30" />
          <p className="text-sm">No tickets yet.</p>
          <button onClick={openNew} className="text-purple-600 hover:opacity-80 text-sm font-semibold transition">
            + Add your first ticket
          </button>
        </div>
      )}

      {/* Ticket list */}
      <div className="flex flex-col gap-2">
        {tickets.map(t => {
          const status        = ticketStatus(t);
          const isDeleting    = deleting    === t.id;
          const isConfirm     = deleteId    === t.id && !isDeleting;
          const isToggling    = toggling    === t.id;
          const isEditingThis = editing?.id === t.id;

          return (
            <div key={t.id} className={`rounded-2xl border transition duration-300 overflow-hidden ${
              status === "inactive" || status === "expired"
                ? "bg-white/2 border-gray-400/10 opacity-60"
                : "bg-gray-900 border-gray-400/20 hover:border-[var(--brand-purple)]/40"
            }`}>

              {/* Main row */}
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Icon */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                  t.type === "RSVP"       ? "bg-purple-600/20 border-purple-600/40"
                  : status === "active"   ? "bg-green-900/30 border-green-700/30"
                  :                         "bg-white/5 border-gray-400/20"
                }`}>
                  <Ticket className={`w-4 h-4 ${
                    t.type === "RSVP"     ? "text-purple-600"
                    : status === "active" ? "text-green-400"
                    :                       "text-[var(--muted)]"
                  }`} />
                </div>

                {/* Name + meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[var(--foreground)] font-semibold text-sm truncate">{t.type}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg border ${STATUS_STYLES[status]}`}>
                      {STATUS_LABEL[status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <p className="text-[var(--muted)] text-xs">{t.capacity} spots</p>
                    {t.startsAt && (
                      <p className="text-[var(--muted)] text-xs flex items-center gap-1 opacity-70">
                        <Calendar className="w-3 h-3" />
                        {new Date(t.startsAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        {t.endsAt && <> → {new Date(t.endsAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</>}
                      </p>
                    )}
                  </div>
                </div>

                {/* Price */}
                <span className={`font-bold text-sm shrink-0 ${
                  t.type === "RSVP"     ? "text-purple-600"
                  : status === "active" ? "text-[var(--brand-green)]"
                  :                       "text-[var(--muted)]"
                }`}>
                  {t.type === "RSVP" ? "FREE" : `KES ${t.price}`}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => handleToggle(t)} disabled={isToggling || status === "expired"}
                    title={t.isActive ? "Deactivate ticket" : "Activate ticket"}
                    className="p-1.5 rounded-lg border border-gray-400/20 text-[var(--muted)] hover:border-gray-400 transition duration-300 disabled:opacity-40">
                    {isToggling
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : t.isActive
                        ? <ToggleRight className="w-4 h-4 text-green-400" />
                        : <ToggleLeft  className="w-4 h-4" />
                    }
                  </button>

                  {!isEditingThis && (
                    <button onClick={() => openEdit(t)}
                      className="p-1.5 rounded-lg border border-gray-400/20 text-[var(--muted)] hover:border-purple-600 hover:text-purple-600 transition duration-300">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {isConfirm ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => setDeleteId(null)}
                        className="p-1.5 rounded-lg border border-gray-400/20 text-[var(--muted)] hover:text-[var(--foreground)] transition">
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(t.id)}
                        className="p-1.5 rounded-lg border border-red-700/50 bg-red-900/30 text-red-400 hover:bg-red-900/60 transition">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => handleDelete(t.id)} disabled={isDeleting}
                      className="p-1.5 rounded-lg border border-gray-400/20 text-[var(--muted)] hover:border-red-800/50 hover:text-red-400 transition duration-300 disabled:opacity-40">
                      {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Inline edit form */}
              {isEditingThis && editing && (
                <div className="border-t border-[var(--brand-purple)]/25 bg-white/2 px-4 py-4 flex flex-col gap-4">
                  <p className="text-purple-600 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5" /> Editing ticket
                  </p>

                  <TicketForm editing={editing} setEditing={setEditing} isRsvp={event.stats.isRsvp} />

                  {errorMsg && (
                    <div className="flex items-center gap-2 bg-red-900/20 border border-red-800/50 rounded-xl px-3 py-2 text-red-400 text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {errorMsg}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2">
                    <button onClick={closeEdit}
                      className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition px-3 py-1.5">
                      Cancel
                    </button>
                    <SaveBtn />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* New ticket form */}
      {editing && editing.id === null && (
        <div className="bg-gray-900 border border-[var(--brand-purple)]/25 rounded-2xl p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-purple-600 text-sm font-semibold flex items-center gap-2">
              <Tag className="w-4 h-4" /> New ticket
            </p>
            <button onClick={closeEdit}
              className="text-[var(--muted)] hover:text-[var(--foreground)] transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          <TicketForm editing={editing} setEditing={setEditing} isRsvp={event.stats.isRsvp} />

          {errorMsg && (
            <div className="flex items-center gap-2 bg-red-900/20 border border-red-800/50 rounded-xl px-3 py-2 text-red-400 text-xs">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button onClick={closeEdit}
              className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition px-3 py-1.5">
              Cancel
            </button>
            <SaveBtn />
          </div>
        </div>
      )}

      {tickets.length > 0 && (
        <div className="border-t border-[var(--brand-purple)]/25 pt-4 flex items-center justify-between text-xs text-[var(--muted)]">
          <span>{tickets.length} type{tickets.length !== 1 ? "s" : ""}</span>
          <span>{totalCapacity} total spots · {liveCount} live</span>
        </div>
      )}
    </div>
  );
}