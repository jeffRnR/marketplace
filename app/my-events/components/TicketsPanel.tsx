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
  id:       number | null; // null = new
  type:     string;
  price:    string;
  capacity: number;
  startsAt: string; // datetime-local string e.g. "2026-03-10T09:00"
  endsAt:   string;
  isActive: boolean;
}

const BLANK: Omit<EditingTicket, "id"> = {
  type:     "",
  price:    "",
  capacity: 50,
  startsAt: "",
  endsAt:   "",
  isActive: true,
};

const INPUT     = "bg-gray-800 text-gray-300 rounded-lg px-3 py-2 text-sm border border-gray-700 focus:ring-2 focus:ring-purple-500 outline-none w-full transition duration-300";
const DT_INPUT  = "bg-gray-800 text-gray-300 rounded-lg px-3 py-2 text-sm border border-gray-700 focus:ring-2 focus:ring-purple-500 outline-none w-full transition duration-300 [color-scheme:dark]";

// ── Helpers ──────────────────────────────────────────────────────────────

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  // "2026-03-10T09:00:00.000Z" → "2026-03-10T09:00"
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
  if (!t.isActive) return "inactive";
  if (isExpired(t.endsAt)) return "expired";
  if (isNotStarted(t.startsAt)) return "scheduled";
  return "active";
}

const STATUS_STYLES: Record<string, string> = {
  active:    "bg-green-900/30 border-green-700/50 text-green-400",
  inactive:  "bg-gray-700/40  border-gray-600/50  text-gray-500",
  scheduled: "bg-blue-900/30  border-blue-700/50  text-blue-400",
  expired:   "bg-red-900/20   border-red-700/40   text-red-400",
};

const STATUS_LABEL: Record<string, string> = {
  active:    "Live",
  inactive:  "Off",
  scheduled: "Scheduled",
  expired:   "Expired",
};

// ── Component ─────────────────────────────────────────────────────────────

export function TicketsPanel({
  event,
  onTicketsChanged,
}: {
  event: ManagedEvent;
  onTicketsChanged: (tickets: TicketStat[]) => void;
}) {
  const [tickets,    setTickets]    = useState<TicketStat[]>(event.tickets);
  const [editing,    setEditing]    = useState<EditingTicket | null>(null);
  const [deleteId,   setDeleteId]   = useState<number | null>(null);
  const [deleting,   setDeleting]   = useState<number | null>(null);
  const [toggling,   setToggling]   = useState<number | null>(null);
  const [saveState,  setSaveState]  = useState<SaveState>("idle");
  const [errorMsg,   setErrorMsg]   = useState("");

  const pushTickets = (next: TicketStat[]) => { setTickets(next); onTicketsChanged(next); };

  const openNew  = () => { setEditing({ id: null, ...BLANK }); setErrorMsg(""); setSaveState("idle"); };
  const openEdit = (t: TicketStat) => {
    setEditing({
      id:       t.id,
      type:     t.type,
      price:    t.price,
      capacity: t.capacity,
      startsAt: toDatetimeLocal(t.startsAt),
      endsAt:   toDatetimeLocal(t.endsAt),
      isActive: t.isActive,
    });
    setErrorMsg("");
    setSaveState("idle");
  };
  const closeEdit = () => { setEditing(null); setSaveState("idle"); setErrorMsg(""); };

  // ── Save ──────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.type.trim())                      { setErrorMsg("Ticket name is required.");       return; }
    if (!editing.price.trim() && !event.stats.isRsvp) { setErrorMsg("Price is required.");         return; }
    if (editing.capacity < 1)                      { setErrorMsg("Capacity must be at least 1.");  return; }
    if (editing.startsAt && editing.endsAt && new Date(editing.startsAt) >= new Date(editing.endsAt)) {
      setErrorMsg("End date must be after start date."); return;
    }

    setSaveState("saving");
    setErrorMsg("");

    try {
      const isNew = editing.id === null;
      const body = isNew
        ? {
            eventId:  event.id,
            type:     editing.type,
            price:    event.stats.isRsvp ? "Free" : editing.price,
            capacity: editing.capacity,
            isActive: editing.isActive,
            startsAt: editing.startsAt || null,
            endsAt:   editing.endsAt   || null,
          }
        : {
            ticketId: editing.id,
            type:     editing.type,
            price:    event.stats.isRsvp ? "Free" : editing.price,
            capacity: editing.capacity,
            isActive: editing.isActive,
            startsAt: editing.startsAt || null,
            endsAt:   editing.endsAt   || null,
          };

      const res  = await fetch("/api/tickets", {
        method:  isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");

      const saved: TicketStat = {
        id:       data.ticket.id,
        type:     data.ticket.type,
        price:    data.ticket.price,
        link:     data.ticket.link,
        isActive: data.ticket.isActive,
        startsAt: data.ticket.startsAt ?? null,
        endsAt:   data.ticket.endsAt   ?? null,
        capacity: (() => {
          const m = data.ticket.link?.match(/^capacity:(\d+)$/);
          return m ? parseInt(m[1]) : editing.capacity;
        })(),
      };

      pushTickets(isNew ? [...tickets, saved] : tickets.map((t) => (t.id === saved.id ? saved : t)));
      setSaveState("saved");
      setTimeout(closeEdit, 700);
    } catch (err: any) {
      setErrorMsg(err.message ?? "Something went wrong.");
      setSaveState("error");
    }
  };

  // ── Toggle isActive ───────────────────────────────────────────────────

  const handleToggle = async (t: TicketStat) => {
    setToggling(t.id);
    try {
      const res  = await fetch("/api/tickets", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ticketId: t.id, isActive: !t.isActive }),
      });
      if (!res.ok) throw new Error();
      pushTickets(tickets.map((x) => x.id === t.id ? { ...x, isActive: !x.isActive } : x));
    } catch { /* silent */ }
    finally { setToggling(null); }
  };

  // ── Delete ────────────────────────────────────────────────────────────

  const handleDelete = async (ticketId: number) => {
    if (deleteId !== ticketId) { setDeleteId(ticketId); return; }
    setDeleting(ticketId);
    try {
      const res = await fetch(`/api/tickets?ticketId=${ticketId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      pushTickets(tickets.filter((t) => t.id !== ticketId));
    } catch { /* silent */ }
    finally { setDeleting(null); setDeleteId(null); }
  };

  const totalCapacity = tickets.reduce((s, t) => s + t.capacity, 0);
  const liveCount     = tickets.filter((t) => ticketStatus(t) === "active").length;

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-300 font-semibold text-sm">
            {tickets.length} ticket type{tickets.length !== 1 ? "s" : ""}
            <span className="text-gray-600 font-normal"> · </span>
            <span className="text-green-400">{liveCount} live</span>
            <span className="text-gray-600 font-normal"> · {totalCapacity} total spots</span>
          </p>
          <p className="text-gray-500 text-xs mt-0.5">
            Toggle tickets on/off or set a date window — only live tickets are shown to attendees.
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-600 text-gray-400 hover:border-purple-500 hover:text-purple-300 transition duration-300"
        >
          <Plus className="w-3.5 h-3.5" /> New Ticket
        </button>
      </div>

      {/* Empty state */}
      {tickets.length === 0 && !editing && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500 gap-3 border border-dashed border-gray-700 rounded-xl">
          <Ticket className="w-8 h-8 opacity-40" />
          <p className="text-sm">No tickets yet.</p>
          <button onClick={openNew} className="text-purple-400 hover:text-purple-300 text-sm font-medium transition">
            + Add your first ticket
          </button>
        </div>
      )}

      {/* Ticket list */}
      <div className="flex flex-col gap-2">
        {tickets.map((t) => {
          const status      = ticketStatus(t);
          const isDeleting  = deleting  === t.id;
          const isConfirm   = deleteId  === t.id && !isDeleting;
          const isToggling  = toggling  === t.id;
          const isEditingThis = editing?.id === t.id;

          return (
            <div key={t.id} className={`rounded-xl border transition duration-300 overflow-hidden ${
              status === "inactive" || status === "expired"
                ? "bg-gray-800/20 border-gray-700/50 opacity-60"
                : "bg-gray-700/40 border-gray-700 hover:border-gray-600"
            }`}>
              {/* Main row */}
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Icon */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                  t.type === "RSVP"
                    ? "bg-purple-900/50 border-purple-700/50"
                    : status === "active"
                    ? "bg-green-900/30 border-green-700/30"
                    : "bg-gray-700/50 border-gray-600/50"
                }`}>
                  <Ticket className={`w-4 h-4 ${
                    t.type === "RSVP" ? "text-purple-400"
                    : status === "active" ? "text-green-400"
                    : "text-gray-500"
                  }`} />
                </div>

                {/* Name + meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-gray-300 font-semibold text-sm truncate">{t.type}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-md border ${STATUS_STYLES[status]}`}>
                      {STATUS_LABEL[status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <p className="text-gray-500 text-xs">{t.capacity} spots</p>
                    {t.startsAt && (
                      <p className="text-gray-600 text-xs flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(t.startsAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        {t.endsAt && (
                          <> → {new Date(t.endsAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {/* Price */}
                <span className={`font-bold text-sm shrink-0 ${
                  t.type === "RSVP" ? "text-purple-400"
                  : status === "active" ? "text-green-400"
                  : "text-gray-500"
                }`}>
                  {t.type === "RSVP" ? "FREE" : `KES ${t.price}`}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Toggle */}
                  <button
                    onClick={() => handleToggle(t)}
                    disabled={isToggling || status === "expired"}
                    title={t.isActive ? "Deactivate ticket" : "Activate ticket"}
                    className="p-1.5 rounded-lg border border-gray-600 text-gray-400 hover:border-gray-400 transition duration-300 disabled:opacity-40"
                  >
                    {isToggling
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : t.isActive
                      ? <ToggleRight className="w-4 h-4 text-green-400" />
                      : <ToggleLeft  className="w-4 h-4 text-gray-500" />
                    }
                  </button>

                  {/* Edit */}
                  {!isEditingThis && (
                    <button onClick={() => openEdit(t)}
                      className="p-1.5 rounded-lg border border-gray-600 text-gray-500 hover:border-gray-400 hover:text-gray-300 transition duration-300">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Delete */}
                  {isConfirm ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => setDeleteId(null)}
                        className="p-1.5 rounded-lg border border-gray-600 text-gray-400 hover:text-gray-200 transition">
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(t.id)}
                        className="p-1.5 rounded-lg border border-red-700 bg-red-900/30 text-red-400 hover:bg-red-900/60 transition">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => handleDelete(t.id)} disabled={isDeleting}
                      className="p-1.5 rounded-lg border border-gray-600 text-gray-500 hover:border-red-700 hover:text-red-400 transition duration-300 disabled:opacity-40">
                      {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Inline edit form — expands inside the card */}
              {isEditingThis && editing && (
                <div className="border-t border-gray-700 bg-gray-900/50 px-4 py-4 flex flex-col gap-4">
                  <p className="text-purple-300 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5" /> Editing ticket
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-400 font-medium">Name *</label>
                      <input type="text" placeholder="e.g. Early Bird, VIP"
                        value={editing.type}
                        onChange={(e) => setEditing((p) => p && ({ ...p, type: e.target.value }))}
                        className={INPUT} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-400 font-medium">
                        Price (KES){event.stats.isRsvp ? <span className="text-gray-600 font-normal"> — RSVP</span> : " *"}
                      </label>
                      <input type="text" placeholder="1500"
                        value={event.stats.isRsvp ? "Free" : editing.price}
                        onChange={(e) => !event.stats.isRsvp && setEditing((p) => p && ({ ...p, price: e.target.value }))}
                        disabled={event.stats.isRsvp}
                        className={`${INPUT} disabled:opacity-50 disabled:cursor-not-allowed`} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-400 font-medium">Capacity *</label>
                      <input type="number" min={1} placeholder="50"
                        value={editing.capacity}
                        onChange={(e) => setEditing((p) => p && ({ ...p, capacity: Number(e.target.value) }))}
                        className={INPUT} />
                    </div>
                  </div>

                  {/* Date window */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      Sale window <span className="text-gray-600 font-normal">(optional — leave blank for no time limit)</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500">Goes live at</label>
                        <input type="datetime-local"
                          value={editing.startsAt}
                          onChange={(e) => setEditing((p) => p && ({ ...p, startsAt: e.target.value }))}
                          className={DT_INPUT} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500">Expires at</label>
                        <input type="datetime-local"
                          value={editing.endsAt}
                          onChange={(e) => setEditing((p) => p && ({ ...p, endsAt: e.target.value }))}
                          className={DT_INPUT} />
                      </div>
                    </div>
                    {editing.startsAt && editing.endsAt && (
                      <p className="text-xs text-blue-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        On sale {new Date(editing.startsAt).toLocaleString()} →  {new Date(editing.endsAt).toLocaleString()}
                      </p>
                    )}
                  </div>

                  {/* Active toggle */}
                  <div className="flex items-center justify-between bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-3">
                    <div>
                      <p className="text-sm text-gray-300 font-medium">Ticket visible to attendees</p>
                      <p className="text-xs text-gray-500 mt-0.5">Turn off to hide this ticket from the public event page</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditing((p) => p && ({ ...p, isActive: !p.isActive }))}
                      className="shrink-0"
                    >
                      {editing.isActive
                        ? <ToggleRight className="w-8 h-8 text-green-400" />
                        : <ToggleLeft  className="w-8 h-8 text-gray-500" />
                      }
                    </button>
                  </div>

                  {errorMsg && (
                    <div className="flex items-center gap-2 text-red-300 text-xs bg-red-900/20 border border-red-700/40 rounded-lg px-3 py-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {errorMsg}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2">
                    <button onClick={closeEdit} className="text-sm text-gray-500 hover:text-gray-300 transition px-3 py-1.5">Cancel</button>
                    <button onClick={handleSave} disabled={saveState === "saving" || saveState === "saved"}
                      className={`flex items-center gap-2 text-sm font-medium px-4 py-1.5 rounded-lg border transition duration-300 ${
                        saveState === "saved"  ? "bg-green-900/30 border-green-700/50 text-green-400"
                        : saveState === "error" ? "bg-red-900/20 border-red-700/40 text-red-400"
                        : "bg-purple-600 border-purple-500 text-white hover:bg-purple-700 disabled:opacity-50"
                      }`}>
                      {saveState === "saving" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {saveState === "saved"  && <Check    className="w-3.5 h-3.5" />}
                      {saveState === "saved" ? "Saved!" : saveState === "saving" ? "Saving..." : "Save ticket"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* New ticket form (when no existing ticket is being edited) */}
      {editing && editing.id === null && (
        <div className="bg-gray-900/60 border border-purple-700/40 rounded-xl p-4 flex flex-col gap-4 animate-slideDown">
          <div className="flex items-center justify-between">
            <p className="text-purple-300 text-sm font-semibold flex items-center gap-2">
              <Tag className="w-4 h-4" /> New ticket
            </p>
            <button onClick={closeEdit} className="text-gray-500 hover:text-gray-300 transition"><X className="w-4 h-4" /></button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400 font-medium">Name *</label>
              <input type="text" placeholder="e.g. Early Bird, VIP"
                value={editing.type}
                onChange={(e) => setEditing((p) => p && ({ ...p, type: e.target.value }))}
                className={INPUT} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400 font-medium">
                Price (KES){event.stats.isRsvp ? <span className="text-gray-600 font-normal"> — RSVP</span> : " *"}
              </label>
              <input type="text" placeholder="1500"
                value={event.stats.isRsvp ? "Free" : editing.price}
                onChange={(e) => !event.stats.isRsvp && setEditing((p) => p && ({ ...p, price: e.target.value }))}
                disabled={event.stats.isRsvp}
                className={`${INPUT} disabled:opacity-50 disabled:cursor-not-allowed`} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400 font-medium">Capacity *</label>
              <input type="number" min={1} placeholder="50"
                value={editing.capacity}
                onChange={(e) => setEditing((p) => p && ({ ...p, capacity: Number(e.target.value) }))}
                className={INPUT} />
            </div>
          </div>

          {/* Date window */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              Sale window <span className="text-gray-600 font-normal">(optional)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Goes live at</label>
                <input type="datetime-local"
                  value={editing.startsAt}
                  onChange={(e) => setEditing((p) => p && ({ ...p, startsAt: e.target.value }))}
                  className={DT_INPUT} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Expires at</label>
                <input type="datetime-local"
                  value={editing.endsAt}
                  onChange={(e) => setEditing((p) => p && ({ ...p, endsAt: e.target.value }))}
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
          <div className="flex items-center justify-between bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-3">
            <div>
              <p className="text-sm text-gray-300 font-medium">Ticket visible to attendees</p>
              <p className="text-xs text-gray-500 mt-0.5">Turn off to hide this ticket from the public event page</p>
            </div>
            <button type="button" onClick={() => setEditing((p) => p && ({ ...p, isActive: !p.isActive }))}>
              {editing.isActive
                ? <ToggleRight className="w-8 h-8 text-green-400" />
                : <ToggleLeft  className="w-8 h-8 text-gray-500" />
              }
            </button>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 text-red-300 text-xs bg-red-900/20 border border-red-700/40 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button onClick={closeEdit} className="text-sm text-gray-500 hover:text-gray-300 transition px-3 py-1.5">Cancel</button>
            <button onClick={handleSave} disabled={saveState === "saving" || saveState === "saved"}
              className={`flex items-center gap-2 text-sm font-medium px-4 py-1.5 rounded-lg border transition duration-300 ${
                saveState === "saved"  ? "bg-green-900/30 border-green-700/50 text-green-400"
                : saveState === "error" ? "bg-red-900/20 border-red-700/40 text-red-400"
                : "bg-purple-600 border-purple-500 text-white hover:bg-purple-700 disabled:opacity-50"
              }`}>
              {saveState === "saving" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saveState === "saved"  && <Check    className="w-3.5 h-3.5" />}
              {saveState === "saved" ? "Saved!" : saveState === "saving" ? "Saving..." : "Save ticket"}
            </button>
          </div>
        </div>
      )}

      {tickets.length > 0 && (
        <div className="border-t border-gray-700 pt-4 flex items-center justify-between text-xs text-gray-500">
          <span>{tickets.length} type{tickets.length !== 1 ? "s" : ""}</span>
          <span>{totalCapacity} total spots · {liveCount} live</span>
        </div>
      )}
    </div>
  );
}