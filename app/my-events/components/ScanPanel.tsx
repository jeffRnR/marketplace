"use client";
// app/my-events/components/ScanPanel.tsx

import { useState, useEffect, useCallback } from "react";
import {
  QrCode, Plus, Trash2, Link2, Copy, CheckCircle, Loader2,
  Shield, Clock, ChevronDown, ChevronUp, AlertCircle, Users,
  ToggleLeft, ToggleRight, RefreshCw, Ticket, ClipboardList,
  ChevronLeft, ChevronRight, X,
} from "lucide-react";
import { ManagedEvent } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScanSession {
  id: string;
  token: string;
  label: string;
  expiresAt: string;
  isActive: boolean;
  isEmailed: boolean;
  lastUsed: string | null;
}

interface Station {
  id: string;
  name: string;
  order: number;
  isActive: boolean;
  isFinal: boolean;
  createdAt: string;
  _count: { logs: number; sessions: number };
  sessions: ScanSession[];
}

interface ScanLog {
  id: string;
  ticketCode: string;
  result: string;
  note: string | null;
  scannedAt: string;
  session: { label: string } | null;
  station: { name: string; order: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relTime(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", timeZone: "Africa/Nairobi" });
}

function expiryLabel(d: string) {
  const left = new Date(d).getTime() - Date.now();
  if (left <= 0) return "Expired";
  const h = Math.floor(left / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

const RESULT_META: Record<string, { label: string; color: string; bg: string }> = {
  success:           { label: "Admitted",        color: "text-green-400",  bg: "bg-green-900/20 border-green-700/30" },
  duplicate_final:   { label: "Already admitted", color: "text-red-400",   bg: "bg-red-900/20 border-red-700/30" },
  invalid:           { label: "Invalid",          color: "text-red-400",   bg: "bg-red-900/20 border-red-700/30" },
  already_scanned:   { label: "Already scanned",  color: "text-amber-400", bg: "bg-amber-900/20 border-amber-700/30" },
  wrong_order:       { label: "Wrong order",      color: "text-amber-400", bg: "bg-amber-900/20 border-amber-700/30" },
  suspicious:        { label: "Suspicious",       color: "text-orange-400",bg: "bg-orange-900/20 border-orange-700/30" },
  fraud_detected:    { label: "Fraud flag",       color: "text-red-400",   bg: "bg-red-900/20 border-red-700/30" },
  capacity_exceeded: { label: "Capacity full",    color: "text-red-400",   bg: "bg-red-900/20 border-red-700/30" },
};

const INPUT = "w-full bg-white/5 border border-gray-400/50 rounded-xl px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)] text-sm outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/30 transition";

// ─── Logs drawer ──────────────────────────────────────────────────────────────

function LogsDrawer({ station }: { station: Station }) {
  const [logs,    setLogs]    = useState<ScanLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [total,   setTotal]   = useState(0);
  const [filter,  setFilter]  = useState<string>("all");

  const fetchLogs = useCallback(async (p = 1) => {
    setLoading(true); setError("");
    try {
      const res  = await fetch(`/api/scan/logs?stationId=${station.id}&page=${p}`);
      if (!res.ok) throw new Error("Failed to load logs");
      const data = await res.json();
      setLogs(data.logs); setPage(data.page); setPages(data.pages); setTotal(data.total);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [station.id]);

  useEffect(() => { fetchLogs(1); }, [fetchLogs]);

  const filtered = filter === "all" ? logs : logs.filter(l => l.result === filter);
  const resultCounts = logs.reduce((acc, l) => {
    acc[l.result] = (acc[l.result] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="border-t border-[var(--brand-purple)]/25 bg-white/2 p-4 space-y-3">

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[var(--muted)] text-xs font-semibold uppercase tracking-widest">Filter</span>
        {(["all","success","invalid","duplicate_final","already_scanned","wrong_order","suspicious","fraud_detected","capacity_exceeded"] as const).map(r => {
          const meta  = r === "all" ? null : RESULT_META[r];
          const count = r === "all" ? total : (resultCounts[r] ?? 0);
          if (r !== "all" && count === 0) return null;
          return (
            <button
              key={r}
              onClick={() => setFilter(r)}
              className={`text-xs px-2.5 py-1 rounded-full border transition font-semibold ${
                filter === r
                  ? "bg-purple-600 border-purple-600 text-white"
                  : "bg-white/5 border-gray-400/50 text-[var(--muted)] hover:border-purple-600 hover:text-[var(--foreground)]"
              }`}
            >
              {meta?.label ?? "All"}{count > 0 && <span className="opacity-70 ml-1">({count})</span>}
            </button>
          );
        })}
        <button onClick={() => fetchLogs(page)} className="ml-auto p-1 text-[var(--muted)] hover:text-[var(--foreground)] transition">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Log rows */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-red-400 text-xs py-2">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-[var(--muted)] text-sm text-center py-4">No scan logs yet.</p>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(log => {
            const meta = RESULT_META[log.result] ?? { label: log.result, color: "text-[var(--muted)]", bg: "bg-white/5 border-gray-400/20" };
            const time = new Date(log.scannedAt);
            const isDeny    = ["invalid","duplicate_final","fraud_detected","capacity_exceeded"].includes(log.result);
            const isWarning = ["already_scanned","wrong_order","suspicious"].includes(log.result);
            const displayNote = log.note
              ?.replace(/^IP: [^\s]+ \| sig: (verified|unsigned\/manual)\s*/, "")
              ?.replace(/^Ticket not found or not for this event\.$/, "Ticket not found for this event.")
              ?.trim() || null;

            return (
              <div key={log.id} className={`rounded-xl border px-3 py-2.5 ${meta.bg}`}>
                <div className="flex items-start gap-2 flex-wrap sm:flex-nowrap">
                  <span className={`text-xs font-bold shrink-0 w-28 mt-0.5 ${meta.color}`}>{meta.label}</span>
                  <span className="font-mono text-[var(--foreground)] text-xs shrink-0 mt-0.5 tracking-wider">
                    {log.ticketCode.slice(0, 8).toUpperCase()}
                  </span>
                  <span className="text-[var(--muted)] text-xs truncate flex-1 mt-0.5 min-w-0">
                    {log.session?.label ?? "Unknown scanner"}
                  </span>
                  <div className="text-right shrink-0 ml-auto">
                    <p className="text-[var(--foreground)] text-xs">
                      {time.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" })}
                    </p>
                    <p className="text-[var(--muted)] text-xs opacity-60">{relTime(log.scannedAt)}</p>
                  </div>
                </div>
                {displayNote && (isDeny || isWarning) && (
                  <p className={`text-xs mt-1.5 pl-0 sm:pl-28 leading-snug ${isDeny ? "text-red-400/70" : isWarning ? "text-amber-400/70" : "text-[var(--muted)]"}`}>
                    {displayNote}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <button onClick={() => fetchLogs(page - 1)} disabled={page === 1}
            className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-30 transition">
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </button>
          <span className="text-[var(--muted)] text-xs">Page {page} of {pages}</span>
          <button onClick={() => fetchLogs(page + 1)} disabled={page === pages}
            className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-30 transition">
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Generate link modal ──────────────────────────────────────────────────────

function GenerateLinkModal({ station, event, onClose, onCreated }: {
  station:   Station;
  event:     ManagedEvent;
  onClose:   () => void;
  onCreated: (url: string, isEmailed: boolean) => void;
}) {
  const [label,  setLabel]  = useState("");
  const [hours,  setHours]  = useState("12");
  const [email,  setEmail]  = useState("");
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  useEffect(() => {
    const handle = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [onClose]);

  async function handleCreate() {
    if (!label.trim() || !hours) return;
    setSaving(true); setError("");
    try {
      const res  = await fetch("/api/scan/sessions", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ stationId: station.id, label: label.trim(), expiresInHours: Number(hours) }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }

      if (email.trim()) {
        await fetch("/api/scan/send-link-email", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            to: email.trim(), scannerName: label.trim(), eventTitle: event.title,
            eventDate: event.date, eventLocation: event.location,
            stationName: station.name, scanUrl: data.url, expiresAt: data.session.expiresAt,
          }),
        });
        await fetch("/api/scan/sessions", {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ sessionId: data.session.id, isEmailed: true }),
        });
      }
      onCreated(data.url, email.trim() !== "");
    } catch { setError("Network error."); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-400/20 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--brand-purple)]/25">
          <div>
            <h3 className="text-[var(--foreground)] font-bold">Generate Scanner Link</h3>
            <p className="text-[var(--muted)] text-sm mt-0.5">{station.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--foreground)] transition p-1 rounded-lg hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="block text-[var(--muted)] text-xs font-semibold mb-1.5 uppercase tracking-wider">Scanner label *</label>
            <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. John at Gate 1" className={INPUT} />
          </div>
          <div>
            <label className="block text-[var(--muted)] text-xs font-semibold mb-1.5 uppercase tracking-wider">Team member email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@example.com" className={INPUT} />
          </div>
          <div>
            <label className="block text-[var(--muted)] text-xs font-semibold mb-1.5 uppercase tracking-wider">Link valid for *</label>
            <div className="flex gap-2 mb-2">
              {[4, 8, 12, 24, 48].map(h => (
                <button
                  key={h}
                  onClick={() => setHours(String(h))}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition ${
                    hours === String(h)
                      ? "bg-purple-600 border-purple-600 text-white"
                      : "bg-white/5 border-gray-400/50 text-[var(--muted)] hover:border-purple-600"
                  }`}
                >
                  {h}h
                </button>
              ))}
            </div>
            <input
              type="number" min="1" max="168" value={hours}
              onChange={e => setHours(e.target.value)}
              placeholder="Custom hours" className={INPUT}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-900/20 border border-red-800/50 rounded-xl px-3 py-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={saving || !label.trim() || !hours}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold py-3 rounded-xl text-sm transition duration-300"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
            Generate Link
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Station card ─────────────────────────────────────────────────────────────

function StationCard({ station, eventId, event, onRefresh }: {
  station:   Station;
  eventId:   string;
  event:     ManagedEvent;
  onRefresh: () => void;
}) {
  const [expanded,  setExpanded]  = useState(false);
  const [showLogs,  setShowLogs]  = useState(false);
  const [showGen,   setShowGen]   = useState(false);
  const [newLink,   setNewLink]   = useState("");
  const [isEmailed, setIsEmailed] = useState(false);
  const [copied,    setCopied]    = useState(false);
  const [revoking,  setRevoking]  = useState<string | null>(null);
  const [toggling,  setToggling]  = useState(false);
  const [showUrls,  setShowUrls]  = useState<Record<string, boolean>>({});

  async function revokeSession(sessionId: string) {
    setRevoking(sessionId);
    await fetch(`/api/scan/sessions?sessionId=${sessionId}`, { method: "DELETE" });
    setRevoking(null);
    onRefresh();
  }

  async function toggleStation() {
    setToggling(true);
    await fetch("/api/scan/stations", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stationId: station.id, isActive: !station.isActive }),
    });
    setToggling(false);
    onRefresh();
  }

  async function toggleFinal() {
    await fetch("/api/scan/stations", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stationId: station.id, isFinal: !station.isFinal }),
    });
    onRefresh();
  }

  async function deleteStation() {
    if (!confirm(`Delete "${station.name}"? This cannot be undone.`)) return;
    await fetch(`/api/scan/stations?stationId=${station.id}`, { method: "DELETE" });
    onRefresh();
  }

  function copyLink(url: string) {
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  const baseUrl       = typeof window !== "undefined" ? window.location.origin : "";
  const activeSessions = station.sessions.filter(s => s.isActive && new Date(s.expiresAt) > new Date());

  return (
    <>
      <div className={`bg-gray-900 border rounded-2xl overflow-hidden transition duration-300 ${
        station.isActive ? "border-gray-400/20" : "border-gray-400/10 opacity-60"
      }`}>

        {/* Header */}
        <div className="p-4">
          <div className="flex items-center gap-3">
            {/* Order badge */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
              station.isFinal ? "bg-purple-600 text-white" : "bg-white/5 border border-gray-400/20 text-[var(--muted)]"
            }`}>
              {station.order}
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[var(--foreground)] font-bold truncate">{station.name}</p>
                {station.isFinal && (
                  <span className="text-xs bg-purple-600/20 border border-purple-600/40 text-purple-400 px-2 py-0.5 rounded-full">
                    Final
                  </span>
                )}
                {!station.isActive && (
                  <span className="text-xs text-[var(--muted)] bg-white/5 border border-gray-400/20 px-2 py-0.5 rounded-full">
                    Paused
                  </span>
                )}
              </div>
              <p className="text-[var(--muted)] text-xs mt-0.5">
                {station._count.logs} scans · {activeSessions.length} active scanner{activeSessions.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Action row — full width below on mobile */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <button
              onClick={() => setShowGen(true)}
              className="flex items-center gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold px-3 py-1.5 rounded-lg transition duration-300"
            >
              <Link2 className="w-3.5 h-3.5" /> Link
            </button>

            <button
              onClick={() => { setShowLogs(v => !v); setExpanded(false); }}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition duration-300 ${
                showLogs
                  ? "bg-blue-600/20 border-blue-700/40 text-blue-400"
                  : "bg-white/5 border-gray-400/50 text-[var(--muted)] hover:text-[var(--foreground)] hover:border-purple-600"
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" /> Logs
              {station._count.logs > 0 && (
                <span className="bg-white/10 text-[var(--foreground)] text-xs px-1.5 py-0.5 rounded-full font-bold leading-none">
                  {station._count.logs}
                </span>
              )}
            </button>

            {/* Icon controls */}
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                onClick={toggleStation}
                disabled={toggling}
                title={station.isActive ? "Pause station" : "Activate station"}
                className="p-1.5 rounded-lg border border-gray-400/20 text-[var(--muted)] hover:text-[var(--foreground)] transition"
              >
                {toggling
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : station.isActive
                    ? <ToggleRight className="w-4 h-4 text-green-400" />
                    : <ToggleLeft className="w-4 h-4" />
                }
              </button>

              <button
                onClick={toggleFinal}
                title="Toggle final station"
                className={`p-1.5 rounded-lg border transition duration-300 ${
                  station.isFinal
                    ? "border-purple-600/50 text-purple-400 bg-purple-600/10"
                    : "border-gray-400/20 text-[var(--muted)] hover:text-purple-400 hover:border-purple-600/50"
                }`}
              >
                <Shield className="w-4 h-4" />
              </button>

              <button
                onClick={deleteStation}
                className="p-1.5 rounded-lg border border-gray-400/20 text-[var(--muted)] hover:text-red-400 hover:border-red-800/50 transition duration-300"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => { setExpanded(v => !v); setShowLogs(false); }}
                className="p-1.5 rounded-lg border border-gray-400/20 text-[var(--muted)] hover:text-[var(--foreground)] transition"
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* New link success banner */}
        {newLink && (
          <div className="mx-4 mb-4 bg-green-900/20 border border-green-700/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-green-400 text-sm font-semibold mb-2">
                  {isEmailed ? "Scanner link sent via email!" : "New scanner link ready!"}
                </p>
                {!isEmailed && (
                  <>
                    <p className="text-green-300 text-xs font-mono break-all mb-3">{newLink}</p>
                    <button
                      onClick={() => copyLink(newLink)}
                      className="flex items-center gap-1.5 text-xs bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg transition"
                    >
                      {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copied!" : "Copy Link"}
                    </button>
                  </>
                )}
                {isEmailed && (
                  <p className="text-green-300 text-xs">The link has been sent to the team member's email.</p>
                )}
                <button
                  onClick={() => { setNewLink(""); setIsEmailed(false); }}
                  className="text-xs text-green-400 hover:text-green-300 mt-2 transition"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Logs drawer */}
        {showLogs && <LogsDrawer station={station} />}

        {/* Sessions list */}
        {expanded && (
          <div className="border-t border-[var(--brand-purple)]/25 p-4 space-y-2">
            <p className="text-[var(--muted)] text-xs font-semibold uppercase tracking-widest mb-3">
              Scanner Links
            </p>
            {station.sessions.length === 0 ? (
              <p className="text-[var(--muted)] text-sm">No scanner links yet.</p>
            ) : (
              station.sessions.map(s => {
                const expired    = new Date(s.expiresAt) < new Date();
                const sessionUrl = `${baseUrl}/scan/${s.token}`;
                return (
                  <div
                    key={s.id}
                    className={`bg-white/2 border border-gray-400/20 rounded-xl px-3 py-2.5 ${!s.isActive || expired ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[var(--foreground)] text-sm font-semibold truncate">{s.label}</p>
                        <p className="text-[var(--muted)] text-xs mt-0.5 flex items-center gap-2 flex-wrap">
                          <Clock className="w-3 h-3 shrink-0" />
                          {!s.isActive ? "Revoked" : expired ? "Expired" : expiryLabel(s.expiresAt)}
                          {s.lastUsed && <span>· Last used {relTime(s.lastUsed)}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!s.isEmailed && (
                          <button
                            onClick={() => setShowUrls(p => ({ ...p, [s.id]: !p[s.id] }))}
                            className="text-xs text-purple-600 hover:opacity-80 transition font-semibold"
                          >
                            {showUrls[s.id] ? "Hide" : "Link"}
                          </button>
                        )}
                        {s.isEmailed && (
                          <span className="text-xs text-[var(--muted)] border border-gray-400/20 px-2 py-0.5 rounded-full">Emailed</span>
                        )}
                        {s.isActive && !expired && (
                          <button
                            onClick={() => revokeSession(s.id)}
                            disabled={revoking === s.id}
                            className="text-xs text-red-400 hover:text-red-300 transition font-semibold"
                          >
                            {revoking === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Revoke"}
                          </button>
                        )}
                      </div>
                    </div>

                    {showUrls[s.id] && !s.isEmailed && (
                      <div className="mt-2 pt-2 border-t border-gray-400/20">
                        <div className="flex items-center gap-2">
                          <p className="text-[var(--foreground)] text-xs font-mono truncate flex-1 bg-white/5 border border-gray-400/20 px-2 py-1.5 rounded-lg">
                            {sessionUrl}
                          </p>
                          <button
                            onClick={() => copyLink(sessionUrl)}
                            className="flex items-center gap-1 text-xs bg-purple-600 hover:bg-purple-700 text-white px-2.5 py-1.5 rounded-lg transition shrink-0"
                          >
                            <Copy className="w-3.5 h-3.5" /> Copy
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {showGen && (
        <GenerateLinkModal
          station={station}
          event={event}
          onClose={() => setShowGen(false)}
          onCreated={(url, emailed) => {
            setNewLink(url);
            setIsEmailed(emailed);
            setShowGen(false);
            setExpanded(true);
            onRefresh();
          }}
        />
      )}
    </>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function ScanPanel({ event }: { event: ManagedEvent }) {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [newName,  setNewName]  = useState("");
  const [adding,   setAdding]   = useState(false);
  const [showAdd,  setShowAdd]  = useState(false);

  const fetchStations = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/scan/stations?eventId=${event.id}`);
      if (!res.ok) throw new Error("Failed to load stations");
      setStations(await res.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [event.id]);

  useEffect(() => { fetchStations(); }, [fetchStations]);

  async function addStation() {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/scan/stations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, name: newName.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setNewName(""); setShowAdd(false); fetchStations();
    } catch (e: any) { setError(e.message); }
    finally { setAdding(false); }
  }

  const activeCount   = stations.filter(s => s.isActive).length;
  const totalScans    = stations.reduce((s, st) => s + st._count.logs, 0);
  const totalScanners = stations.reduce((s, st) =>
    s + st.sessions.filter(ss => ss.isActive && new Date(ss.expiresAt) > new Date()).length, 0);

  return (
    <div className="flex flex-col gap-5">

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Stations",        value: activeCount,   icon: Shield,  color: "text-purple-600" },
          { label: "Active scanners", value: totalScanners, icon: Users,   color: "text-[var(--brand-green)]" },
          { label: "Total scans",     value: totalScans,    icon: Ticket,  color: "text-blue-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-gray-900 border border-gray-400/20 rounded-xl p-3 text-center">
            <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
            <p className={`text-xl font-black ${color}`}>{value}</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="bg-white/2 border border-gray-400/20 rounded-xl px-4 py-3 text-[var(--muted)] text-xs leading-relaxed space-y-1">
        <p className="font-semibold text-[var(--foreground)] mb-1">How it works</p>
        <p>• Create stations in order (e.g. Gate 1 → Security → Final Check).</p>
        <p>• Mark the last station as "Final" using the shield icon — it marks tickets as admitted.</p>
        <p>• Generate a scanner link per station and share with your team. No login needed.</p>
        <p>• Tickets must pass stations in sequence. Use "Logs" to see every scan attempt.</p>
      </div>

      {/* Header + add */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[var(--foreground)] font-bold text-sm">Scanning Stations</h3>
        <div className="flex items-center gap-2">
          <button onClick={fetchStations} className="p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] transition">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowAdd(v => !v)}
            className="flex items-center gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold px-3 py-1.5 rounded-lg transition duration-300"
          >
            <Plus className="w-3.5 h-3.5" /> Add Station
          </button>
        </div>
      </div>

      {/* Add station input */}
      {showAdd && (
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addStation()}
            placeholder="e.g. Main Gate, Security Check, VIP Entry"
            className="flex-1 bg-white/5 border border-gray-400/50 rounded-xl px-4 py-2.5 text-[var(--foreground)] placeholder:text-[var(--muted)] text-sm outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/30 transition"
          />
          <button
            onClick={addStation}
            disabled={adding || !newName.trim()}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition duration-300"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setShowAdd(false)}
            className="px-3 text-[var(--muted)] hover:text-[var(--foreground)] transition text-sm"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-900/20 border border-red-800/50 rounded-xl px-4 py-3 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Station list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
        </div>
      ) : stations.length === 0 ? (
        <div className="text-center py-12 bg-gray-900 border border-gray-400/20 rounded-2xl">
          <QrCode className="w-10 h-10 text-[var(--muted)] opacity-30 mx-auto mb-3" />
          <p className="text-[var(--foreground)] font-semibold">No scanning stations yet</p>
          <p className="text-[var(--muted)] text-sm mt-1">Add your first station to start scanning tickets.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {stations.map(station => (
            <StationCard
              key={station.id}
              station={station}
              eventId={String(event.id)}
              event={event}
              onRefresh={fetchStations}
            />
          ))}
        </div>
      )}
    </div>
  );
}