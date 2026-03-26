"use client";
// app/scan/[token]/page.tsx

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import {
  QrCode, CheckCircle, XCircle, AlertTriangle,
  Loader2, Keyboard, Camera, Ticket, WifiOff,
  ShieldAlert, WifiOff as OfflineIcon, ArrowRight,
} from "lucide-react";

const isMobile = () =>
  typeof window !== "undefined" &&
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

interface SessionInfo {
  valid:     boolean;
  sessionId: string;
  label:     string;
  expiresAt: string;
  station:   { id: string; name: string; order: number; isFinal: boolean };
  event:     { id: number; title: string; date: string; location: string; image: string };
}

type ScanResult =
  | "idle" | "loading" | "success" | "invalid"
  | "already_scanned" | "wrong_order" | "duplicate_final"
  | "fraud_detected" | "suspicious" | "capacity_exceeded";

const QR_SIZE = 260;

// ─── Offline queue (IndexedDB) ────────────────────────────────────────────────

interface PendingScan {
  id:         number;
  token:      string;
  ticketCode: string;
  queuedAt:   number;
  attempts:   number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("noizy-scanner", 1);
    req.onupgradeneeded = () =>
      req.result.createObjectStore("pending", { keyPath: "id", autoIncrement: true });
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function queueScan(token: string, ticketCode: string): Promise<void> {
  const db    = await openDB();
  const store = db.transaction("pending", "readwrite").objectStore("pending");
  store.add({ token, ticketCode, queuedAt: Date.now(), attempts: 0 } as Omit<PendingScan, "id">);
}

async function getPendingScans(): Promise<PendingScan[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction("pending", "readonly").objectStore("pending").getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function deletePendingScan(id: number): Promise<void> {
  const db = await openDB();
  db.transaction("pending", "readwrite").objectStore("pending").delete(id);
}

async function incrementAttempts(scan: PendingScan): Promise<void> {
  const db    = await openDB();
  const store = db.transaction("pending", "readwrite").objectStore("pending");
  store.put({ ...scan, attempts: scan.attempts + 1 });
}

// ─── Result overlay ───────────────────────────────────────────────────────────

function ResultScreen({
  result, message, ticketType, isFinal, laneNote, onReset,
}: {
  result:     ScanResult;
  message:    string;
  ticketType?: string;
  isFinal?:   boolean;
  laneNote?:  string | null;
  onReset:    () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onReset, result === "success" ? 4000 : 4000);
    return () => clearTimeout(t);
  }, [result, onReset]);

  const base = "fixed inset-0 flex flex-col items-center justify-center gap-6 z-50 p-8 text-white";

  if (result === "success") return (
    <div className={`${base} bg-green-600`}>
      <CheckCircle className="w-24 h-24" />
      <div className="text-center">
        <p className="text-4xl font-black mb-2">ADMIT</p>
        {ticketType && <p className="text-2xl font-bold opacity-90">{ticketType}</p>}
        {isFinal && <p className="text-lg opacity-70 mt-1">Final checkpoint ✓</p>}
        {laneNote && (
          <div className="mt-4 flex items-center justify-center gap-2 bg-white/20 rounded-2xl px-5 py-3">
            <ArrowRight className="w-5 h-5 shrink-0" />
            <p className="text-lg font-bold">{laneNote}</p>
          </div>
        )}
        <p className="text-base opacity-60 mt-4">{message}</p>
      </div>
      <p className="text-sm opacity-50">Resetting in 4s…</p>
    </div>
  );

  if (result === "invalid" || result === "duplicate_final" || result === "fraud_detected") return (
    <div className={`${base} bg-red-600`}>
      <XCircle className="w-24 h-24" />
      <div className="text-center max-w-xs">
        <p className="text-4xl font-black mb-2">DENY</p>
        <p className="text-lg opacity-90 leading-relaxed">
          {result === "duplicate_final"
            ? "Already admitted — ticket has been used."
            : result === "fraud_detected"
            ? "Ticket used at another checkpoint seconds ago."
            : message || "Invalid ticket."}
        </p>
      </div>
      <p className="text-sm opacity-50">Resetting in 4s…</p>
    </div>
  );

  if (result === "already_scanned" || result === "wrong_order") return (
    <div className={`${base} bg-amber-500`}>
      <AlertTriangle className="w-24 h-24" />
      <div className="text-center max-w-xs">
        <p className="text-4xl font-black mb-2">WAIT</p>
        <p className="text-lg opacity-90 leading-relaxed">{message}</p>
      </div>
      <p className="text-sm opacity-70">Resetting in 4s…</p>
    </div>
  );

  // Suspicious — amber but different copy, manual verify prompt
  if (result === "suspicious") return (
    <div className={`${base} bg-amber-600`}>
      <ShieldAlert className="w-24 h-24" />
      <div className="text-center max-w-xs">
        <p className="text-4xl font-black mb-2">VERIFY</p>
        <p className="text-lg opacity-90 leading-relaxed">{message}</p>
        <p className="text-sm opacity-70 mt-3">Ask for photo ID before admitting.</p>
      </div>
      <p className="text-sm opacity-70">Resetting in 4s…</p>
    </div>
  );

  // Capacity exceeded — red with specific message
  if (result === "capacity_exceeded") return (
    <div className={`${base} bg-red-700`}>
      <XCircle className="w-24 h-24" />
      <div className="text-center max-w-xs">
        <p className="text-4xl font-black mb-2">FULL</p>
        <p className="text-lg opacity-90 leading-relaxed">{message}</p>
      </div>
      <p className="text-sm opacity-50">Resetting in 4s…</p>
    </div>
  );

  return null;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ScanPage() {
  const { token } = useParams<{ token: string }>();

  const [sessionInfo,   setSessionInfo]   = useState<SessionInfo | null>(null);
  const [sessionError,  setSessionError]  = useState("");
  const [loading,       setLoading]       = useState(true);
  const [isOnline,      setIsOnline]      = useState(true);
  const [pendingCount,  setPendingCount]  = useState(0);
  const [syncingCount,  setSyncingCount]  = useState(0);

  const [input,      setInput]      = useState("");
  const [scanResult, setScanResult] = useState<ScanResult>("idle");
  const [message,    setMessage]    = useState("");
  const [ticketType, setTicketType] = useState("");
  const [isFinal,    setIsFinal]    = useState(false);
  const [laneNote,   setLaneNote]   = useState<string | null>(null);
  const [scanning,   setScanning]   = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  const scannerRef      = useRef<Html5Qrcode | null>(null);
  const initializingRef = useRef(false);
  const inputRef        = useRef<HTMLInputElement>(null);

  // Online/offline detection
  useEffect(() => {
    const onOnline  = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online",  onOnline);
    window.addEventListener("offline", onOffline);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online",  onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Update pending count from IndexedDB
  const refreshPendingCount = useCallback(async () => {
    const scans = await getPendingScans();
    setPendingCount(scans.length);
  }, []);

  useEffect(() => { refreshPendingCount(); }, [refreshPendingCount]);

  // Load session
  useEffect(() => {
    fetch(`/api/scan/sessions/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.valid) setSessionInfo(data);
        else setSessionError(data.error ?? "Invalid or expired link.");
      })
      .catch(() => setSessionError("Could not connect. Check your internet."))
      .finally(() => setLoading(false));
  }, [token]);

  const resetScan = useCallback(() => {
    setScanResult("idle");
    setMessage(""); setInput(""); setTicketType(""); setIsFinal(false); setLaneNote(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Core scan function — queues offline, fires immediately online
  const doScan = useCallback(async (code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean || !sessionInfo) return;

    setScanning(true);
    setScanResult("loading");

    // Offline path — queue to IndexedDB and show optimistic UI
    if (!navigator.onLine) {
      await queueScan(token, clean);
      await refreshPendingCount();
      setScanResult("success");
      setMessage("Offline — scan queued and will sync when connection returns.");
      setTicketType("");
      setIsFinal(false);
      setLaneNote(null);
      setScanning(false);
      return;
    }

    try {
      const res  = await fetch("/api/scan/verify", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, ticketCode: clean }),
      });
      const data = await res.json();
      setScanResult(data.result as ScanResult);
      setMessage(data.message ?? "");
      setTicketType(data.ticketType ?? "");
      setIsFinal(data.isFinal ?? false);
      setLaneNote(data.laneNote ?? null);
      if (data.result === "success") setCameraActive(false);
    } catch {
      // Network error mid-online → queue it
      await queueScan(token, clean);
      await refreshPendingCount();
      setScanResult("success");
      setMessage("Network error — scan queued and will sync shortly.");
      setLaneNote(null);
    } finally {
      setScanning(false);
    }
  }, [sessionInfo, token, refreshPendingCount]);

  // Sync offline queue when coming back online
  const syncQueue = useCallback(async () => {
    const pending = await getPendingScans();
    if (pending.length === 0) return;
    setSyncingCount(pending.length);

    for (const scan of pending) {
      try {
        const res  = await fetch("/api/scan/verify", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ token: scan.token, ticketCode: scan.ticketCode }),
        });
        if (res.ok) {
          await deletePendingScan(scan.id);
        } else if (res.status >= 400 && res.status < 500) {
          // Client error (invalid ticket etc.) — don't retry, remove it
          await deletePendingScan(scan.id);
        } else {
          await incrementAttempts(scan);
        }
      } catch {
        await incrementAttempts(scan);
      }
    }

    setSyncingCount(0);
    await refreshPendingCount();
  }, [token, refreshPendingCount]);

  useEffect(() => {
    if (isOnline) syncQueue();
  }, [isOnline, syncQueue]);

  // Keep doScan ref fresh for camera callback
  const doScanRef = useRef(doScan);
  useEffect(() => { doScanRef.current = doScan; }, [doScan]);

  // Camera lifecycle
  useEffect(() => {
    if (!cameraActive) {
      if (scannerRef.current && !initializingRef.current) {
        scannerRef.current.stop().catch(() => {}).finally(() => {
          scannerRef.current?.clear();
          scannerRef.current = null;
        });
      }
      return;
    }

    const initCamera = async () => {
      if (initializingRef.current || scannerRef.current) return;
      initializingRef.current = true;
      try {
        scannerRef.current = new Html5Qrcode("qr-reader");
        await scannerRef.current.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: QR_SIZE, height: QR_SIZE }, aspectRatio: 1.0 },
          (decoded) => {
            setCameraActive(false);
            setInput(decoded);
            doScanRef.current(decoded);
          },
          () => {},
        );
      } catch (err) {
        const denied =
          err instanceof DOMException &&
          (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");
        setScanResult("invalid");
        setMessage(denied
          ? "Camera permission denied. Enable camera access in settings and refresh."
          : `Camera failed: ${err instanceof Error ? err.message : "unknown error"}.`);
        setCameraActive(false);
        scannerRef.current = null;
      } finally {
        initializingRef.current = false;
      }
    };

    initCamera();

    return () => {
      if (scannerRef.current && !initializingRef.current) {
        scannerRef.current.stop().catch(() => {}).finally(() => {
          scannerRef.current?.clear();
          scannerRef.current = null;
        });
      }
    };
  }, [cameraActive]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
    </div>
  );

  if (sessionError) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center p-8">
      <WifiOff className="w-16 h-16 text-red-400" />
      <p className="text-white font-black text-2xl">Scanner Unavailable</p>
      <p className="text-gray-400">{sessionError}</p>
    </div>
  );

  if (!sessionInfo) return null;

  const { station, event } = sessionInfo;
  const expiresIn = Math.max(0, Math.round(
    (new Date(sessionInfo.expiresAt).getTime() - Date.now()) / 60000,
  ));

  return (
    <div className="p-4 lg:w-[70%] mt-14 mx-auto w-full min-h-screen flex flex-col gap-6">

      {scanResult !== "idle" && scanResult !== "loading" && (
        <ResultScreen
          result={scanResult} message={message}
          ticketType={ticketType} isFinal={isFinal}
          laneNote={laneNote} onReset={resetScan}
        />
      )}

      {/* Header */}
      <div className="p-4 rounded-2xl border bg-gray-900/30 border-gray-800">
        <div className="flex sm:items-center justify-between mb-2 flex-col sm:flex-row">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-gray-200 font-black text-lg">{station.name}</p>
            {station.isFinal && (
              <span className="text-xs bg-green-400/30 text-gray-200 px-3 py-0.5 rounded-full font-semibold">
                Final
              </span>
            )}
            {/* Offline indicator */}
            {!isOnline && (
              <span className="flex items-center gap-1 text-xs bg-amber-900/40 border border-amber-700/40 text-amber-400 px-2.5 py-0.5 rounded-full font-semibold">
                <OfflineIcon className="w-3 h-3" /> Offline
              </span>
            )}
            {/* Pending sync indicator */}
            {pendingCount > 0 && (
              <span className="text-xs bg-blue-900/40 border border-blue-700/40 text-blue-400 px-2.5 py-0.5 rounded-full font-semibold">
                {syncingCount > 0 ? `Syncing ${syncingCount}…` : `${pendingCount} queued`}
              </span>
            )}
          </div>
          <p className="text-gray-500 text-xs mt-1 sm:mt-0">
            Expires in {expiresIn >= 60
              ? `${Math.floor(expiresIn / 60)}h ${expiresIn % 60}m`
              : `${expiresIn}m`}
          </p>
        </div>
        <p className="text-gray-400 text-sm font-semibold truncate">{event.title}</p>
        <p className="text-gray-500 text-xs">{sessionInfo.label} · Station {station.order}</p>
      </div>

      {/* Offline notice banner */}
      {!isOnline && (
        <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl px-4 py-3">
          <p className="text-amber-400 text-sm font-semibold">Scanning offline</p>
          <p className="text-amber-500/80 text-xs mt-0.5">
            Scans are being saved locally and will sync automatically when you reconnect.
          </p>
        </div>
      )}

      {/* Scanner area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <div
          className="relative rounded-2xl overflow-hidden border-2 transition-colors"
          style={{
            width:       QR_SIZE,
            height:      QR_SIZE,
            borderColor: cameraActive ? "#a855f7" : "#374151",
            borderStyle: cameraActive ? "solid" : "dashed",
          }}
        >
          <div id="qr-reader" className="w-full h-full" />
          {!cameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-600 bg-gray-800/50">
              <QrCode className="w-16 h-16" />
              <p className="text-xs text-center px-4">
                Point camera at QR code<br />or type ticket code below
              </p>
            </div>
          )}
        </div>

        <button
          onClick={() => setCameraActive(v => !v)}
          disabled={scanning}
          className={`px-5 py-2.5 rounded-xl font-bold transition flex items-center gap-2 text-sm disabled:opacity-50 ${
            cameraActive
              ? "bg-red-600/30 hover:bg-red-700/30 text-gray-200"
              : "bg-purple-600 hover:bg-purple-700 text-white"
          }`}
        >
          <Camera className="w-4 h-4" />
          {cameraActive ? "Stop camera" : "Start camera"}
        </button>

        <div className="w-full max-w-sm flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === "Enter" && doScan(input)}
                placeholder="Ticket code…"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
                className="w-full bg-gray-900/60 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-purple-500 uppercase tracking-wider"
              />
            </div>
            <button
              onClick={() => doScan(input)}
              disabled={!input.trim() || scanning}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold px-4 py-3 rounded-xl transition flex items-center"
            >
              {scanning
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : <Ticket className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-gray-600 text-xs text-center">
            Press Enter or tap the button · Camera auto-scans QR codes
          </p>
        </div>
      </div>

      {/* Station progress footer */}
      <div className="p-4 rounded-2xl bg-gray-900/40 border border-gray-800">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {Array.from({ length: station.order }).map((_, i) => {
            const n = i + 1;
            return (
              <div key={n} className="flex items-center gap-2">
                {n > 1 && <div className="w-6 h-px bg-gray-700" />}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  n < station.order
                    ? "bg-green-600 text-white"
                    : "bg-purple-600 text-white ring-2 ring-purple-400"
                }`}>
                  {n}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-gray-600 text-xs text-center mt-2">
          Station {station.order}{station.isFinal ? " · Final checkpoint" : ""}
        </p>
      </div>
    </div>
  );
}