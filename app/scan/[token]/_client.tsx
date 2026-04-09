"use client";
// app/scan/[token]/_client.tsx

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  QrCode,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Keyboard,
  Camera,
  Ticket,
  WifiOff,
  ShieldAlert,
  WifiOff as OfflineIcon,
  ArrowRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionInfo {
  valid: boolean;
  sessionId: string;
  label: string;
  expiresAt: string;
  station: { id: string; name: string; order: number; isFinal: boolean };
  event: {
    id: number;
    title: string;
    date: string;
    location: string;
    image: string;
  };
}

type ScanResult =
  | "idle"
  | "loading"
  | "success"
  | "invalid"
  | "already_scanned"
  | "wrong_order"
  | "duplicate_final"
  | "fraud_detected"
  | "suspicious"
  | "capacity_exceeded";

// ─── Offline queue (IndexedDB) ────────────────────────────────────────────────

interface PendingScan {
  id: number;
  token: string;
  ticketCode: string;
  queuedAt: number;
  attempts: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const req = indexedDB.open("noizy-scanner", 1);
    req.onupgradeneeded = () =>
      req.result.createObjectStore("pending", {
        keyPath: "id",
        autoIncrement: true,
      });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function queueScan(token: string, ticketCode: string): Promise<void> {
  try {
    const db = await openDB();
    const store = db.transaction("pending", "readwrite").objectStore("pending");
    store.add({ token, ticketCode, queuedAt: Date.now(), attempts: 0 } as Omit<
      PendingScan,
      "id"
    >);
  } catch {
    /* silent fail */
  }
}

async function getPendingScans(): Promise<PendingScan[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const req = db
        .transaction("pending", "readonly")
        .objectStore("pending")
        .getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

async function deletePendingScan(id: number): Promise<void> {
  try {
    const db = await openDB();
    db.transaction("pending", "readwrite").objectStore("pending").delete(id);
  } catch {
    /* silent fail */
  }
}

async function incrementAttempts(scan: PendingScan): Promise<void> {
  try {
    const db = await openDB();
    const store = db.transaction("pending", "readwrite").objectStore("pending");
    store.put({ ...scan, attempts: scan.attempts + 1 });
  } catch {
    /* silent fail */
  }
}

// ─── Result overlay ───────────────────────────────────────────────────────────

function ResultScreen({
  result,
  message,
  ticketType,
  isFinal,
  laneNote,
  onReset,
}: {
  result: ScanResult;
  message: string;
  ticketType?: string;
  isFinal?: boolean;
  laneNote?: string | null;
  onReset: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onReset, 4000);
    return () => clearTimeout(t);
  }, [result, onReset]);

  const base =
    "fixed inset-0 flex flex-col items-center justify-center gap-6 z-50 p-8 text-white";

  if (result === "success")
    return (
      <div className={`${base} bg-green-600`}>
        <CheckCircle className="w-24 h-24" />
        <div className="text-center">
          <p className="text-4xl font-black mb-2">ADMIT</p>
          {ticketType && (
            <p className="text-2xl font-bold opacity-90">{ticketType}</p>
          )}
          {isFinal && (
            <p className="text-lg opacity-70 mt-1">Final checkpoint ✓</p>
          )}
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

  if (
    result === "invalid" ||
    result === "duplicate_final" ||
    result === "fraud_detected"
  )
    return (
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

  if (result === "already_scanned" || result === "wrong_order")
    return (
      <div className={`${base} bg-amber-500`}>
        <AlertTriangle className="w-24 h-24" />
        <div className="text-center max-w-xs">
          <p className="text-4xl font-black mb-2">WAIT</p>
          <p className="text-lg opacity-90 leading-relaxed">{message}</p>
        </div>
        <p className="text-sm opacity-70">Resetting in 4s…</p>
      </div>
    );

  if (result === "suspicious")
    return (
      <div className={`${base} bg-amber-600`}>
        <ShieldAlert className="w-24 h-24" />
        <div className="text-center max-w-xs">
          <p className="text-4xl font-black mb-2">VERIFY</p>
          <p className="text-lg opacity-90 leading-relaxed">{message}</p>
          <p className="text-sm opacity-70 mt-3">
            Ask for photo ID before admitting.
          </p>
        </div>
        <p className="text-sm opacity-70">Resetting in 4s…</p>
      </div>
    );

  if (result === "capacity_exceeded")
    return (
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

// ─── Token guard ──────────────────────────────────────────────────────────────

export default function ScanPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center p-8">
        <WifiOff className="w-16 h-16 text-red-400" />
        <p className="text-white font-black text-2xl">Invalid scanner link</p>
        <p className="text-gray-400 text-sm">
          This link appears to be broken. Please request a new one.
        </p>
      </div>
    );
  }

  return <ScannerInner token={token} />;
}

// ─── Main scanner ─────────────────────────────────────────────────────────────

function ScannerInner({ token }: { token: string }) {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [sessionError, setSessionError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncingCount, setSyncingCount] = useState(0);

  const [input, setInput] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult>("idle");
  const [message, setMessage] = useState("");
  const [ticketType, setTicketType] = useState("");
  const [isFinal, setIsFinal] = useState(false);
  const [laneNote, setLaneNote] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);

  // Online/offline
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Pending count
  const refreshPendingCount = useCallback(async () => {
    const scans = await getPendingScans();
    setPendingCount(scans.length);
  }, []);

  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  // Load session
  useEffect(() => {
    fetch(`/api/scan/sessions/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) setSessionInfo(data);
        else setSessionError(data.error ?? "Invalid or expired link.");
      })
      .catch(() => setSessionError("Could not connect. Check your internet."))
      .finally(() => setLoading(false));
  }, [token]);

  const resetScan = useCallback(() => {
    setScanResult("idle");
    setMessage("");
    setInput("");
    setTicketType("");
    setIsFinal(false);
    setLaneNote(null);
    processingRef.current = false;
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const doScan = useCallback(
    async (code: string) => {
      // Never toUpperCase — camera gives signed base64url (case-sensitive)
      const clean = code.trim();
      if (!clean || !sessionInfo || processingRef.current) return;

      processingRef.current = true;
      setScanning(true);
      setScanResult("loading");

      if (!navigator.onLine) {
        await queueScan(token, clean);
        await refreshPendingCount();
        setScanResult("success");
        setMessage(
          "Offline — scan queued and will sync when connection returns.",
        );
        setTicketType("");
        setIsFinal(false);
        setLaneNote(null);
        setScanning(false);
        return;
      }

      try {
        const res = await fetch("/api/scan/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, ticketCode: clean }),
        });
        const data = await res.json();
        setScanResult(data.result as ScanResult);
        setMessage(data.message ?? "");
        setTicketType(data.ticketType ?? "");
        setIsFinal(data.isFinal ?? false);
        setLaneNote(data.laneNote ?? null);
        if (data.result === "success") setCameraActive(false);
      } catch {
        await queueScan(token, clean);
        await refreshPendingCount();
        setScanResult("success");
        setMessage("Network error — scan queued and will sync shortly.");
        setLaneNote(null);
      } finally {
        setScanning(false);
      }
    },
    [sessionInfo, token, refreshPendingCount],
  );

  // Sync queue on reconnect
  const syncQueue = useCallback(async () => {
    const pending = await getPendingScans();
    if (pending.length === 0) return;
    setSyncingCount(pending.length);
    for (const scan of pending) {
      try {
        const res = await fetch("/api/scan/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: scan.token,
            ticketCode: scan.ticketCode,
          }),
        });
        if (res.ok || (res.status >= 400 && res.status < 500)) {
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

  // Keep doScan ref fresh
  const doScanRef = useRef(doScan);
  useEffect(() => {
    doScanRef.current = doScan;
  }, [doScan]);

  // ── Camera using @zxing/browser ───────────────────────────────────────────
  useEffect(() => {
    if (!cameraActive) {
      // Stop stream
      if (controlsRef.current) {
        try {
          controlsRef.current.stop();
        } catch {
          /* ignore */
        }
        controlsRef.current = null;
      }
      // Stop video tracks directly
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
      return;
    }

    let cancelled = false;

    const startCamera = async () => {
      setCameraError("");
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const { NotFoundException } = await import("@zxing/library");

        // Step 1 — check if getUserMedia exists
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError(
            "FAIL: getUserMedia not supported on this browser/device.",
          );
          setCameraActive(false);
          return;
        }
        setCameraError("Step 1 OK: getUserMedia supported");

        // Step 2 — list devices
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        setCameraError(
          `Step 2 OK: found ${devices.length} camera(s): ${devices.map((d) => d.label || "unlabeled").join(", ")}`,
        );

        if (devices.length === 0) {
          setCameraError("FAIL: No camera devices found.");
          setCameraActive(false);
          return;
        }

        // Step 3 — pick camera
        const backCamera =
          devices.find(
            (d) =>
              d.label.toLowerCase().includes("back") ||
              d.label.toLowerCase().includes("rear") ||
              d.label.toLowerCase().includes("environment"),
          ) ?? devices[devices.length - 1];

        setCameraError(
          `Step 3 OK: using camera "${backCamera.label || backCamera.deviceId.slice(0, 8)}"`,
        );

        if (!videoRef.current) {
          setCameraError("FAIL: video element ref is null.");
          setCameraActive(false);
          return;
        }

        // Step 4 — start decoding
        const codeReader = new BrowserMultiFormatReader();
        setCameraError("Step 4: starting decode...");

        controlsRef.current = await codeReader.decodeFromVideoDevice(
          backCamera.deviceId,
          videoRef.current,
          (result, error) => {
            if (result && !processingRef.current) {
              setCameraError(""); // clear debug on success
              const text = result.getText();
              setInput(text);
              doScanRef.current(text);
            }
            if (error && !(error instanceof NotFoundException)) {
              // Only show non-routine errors
              if (!error.message?.includes("No MultiFormat")) {
                setCameraError(`Scan error: ${error.message}`);
              }
            }
          },
        );

        setCameraError("Step 4 OK: camera running — point at QR code");
      } catch (err: any) {
        if (cancelled) return;
        const msg = err?.message ?? String(err) ?? "Unknown error";
        setCameraError(`CRASH at some step: ${msg}`);
        setCameraActive(false);
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      if (controlsRef.current) {
        try {
          controlsRef.current.stop();
        } catch {
          /* ignore */
        }
        controlsRef.current = null;
      }
    };
  }, [cameraActive]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );

  if (sessionError)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center p-8">
        <WifiOff className="w-16 h-16 text-red-400" />
        <p className="text-white font-black text-2xl">Scanner Unavailable</p>
        <p className="text-gray-400">{sessionError}</p>
      </div>
    );

  if (!sessionInfo) return null;

  const { station, event } = sessionInfo;
  const expiresIn = Math.max(
    0,
    Math.round(
      (new Date(sessionInfo.expiresAt).getTime() - Date.now()) / 60000,
    ),
  );

  return (
    <div className="p-4 lg:w-[70%] mt-14 mx-auto w-full min-h-screen flex flex-col gap-6">
      {scanResult !== "idle" && scanResult !== "loading" && (
        <ResultScreen
          result={scanResult}
          message={message}
          ticketType={ticketType}
          isFinal={isFinal}
          laneNote={laneNote}
          onReset={resetScan}
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
            {!isOnline && (
              <span className="flex items-center gap-1 text-xs bg-amber-900/40 border border-amber-700/40 text-amber-400 px-2.5 py-0.5 rounded-full font-semibold">
                <OfflineIcon className="w-3 h-3" /> Offline
              </span>
            )}
            {pendingCount > 0 && (
              <span className="text-xs bg-blue-900/40 border border-blue-700/40 text-blue-400 px-2.5 py-0.5 rounded-full font-semibold">
                {syncingCount > 0
                  ? `Syncing ${syncingCount}…`
                  : `${pendingCount} queued`}
              </span>
            )}
          </div>
          <p className="text-gray-500 text-xs mt-1 sm:mt-0">
            Expires in{" "}
            {expiresIn >= 60
              ? `${Math.floor(expiresIn / 60)}h ${expiresIn % 60}m`
              : `${expiresIn}m`}
          </p>
        </div>
        <p className="text-gray-400 text-sm font-semibold truncate">
          {event.title}
        </p>
        <p className="text-gray-500 text-xs">
          {sessionInfo.label} · Station {station.order}
        </p>
      </div>

      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl px-4 py-3">
          <p className="text-amber-400 text-sm font-semibold">
            Scanning offline
          </p>
          <p className="text-amber-500/80 text-xs mt-0.5">
            Scans are saved locally and will sync when you reconnect.
          </p>
        </div>
      )}

      {/* Scanner area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        {/* Video viewfinder */}
        <div
          className="relative rounded-2xl overflow-hidden border-2 transition-colors w-full"
          style={{
            maxWidth: "320px",
            aspectRatio: "1 / 1",
            borderColor: cameraActive ? "#a855f7" : "#374151",
            borderStyle: cameraActive ? "solid" : "dashed",
            backgroundColor: "#111",
          }}
        >
          {/* ZXing uses a plain <video> element */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            style={{ display: cameraActive ? "block" : "none" }}
            muted
            playsInline
            autoPlay
          />

          {/* Scanning overlay — crosshair guide */}
          {cameraActive && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-purple-400 rounded-tl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-purple-400 rounded-tr" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-purple-400 rounded-bl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-purple-400 rounded-br" />
              </div>
            </div>
          )}

          {!cameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-600">
              <QrCode className="w-16 h-16" />
              <p className="text-xs text-center px-4">
                Point camera at QR code
                <br />
                or type ticket code below
              </p>
            </div>
          )}
        </div>

        {/* Camera error */}
        {/* Camera error/status — show whenever there's a message */}
        {cameraError && (
          <div
            className={`w-full max-w-sm border rounded-xl px-4 py-3 ${
              cameraError.startsWith("FAIL") || cameraError.startsWith("CRASH")
                ? "bg-red-900/20 border-red-700/30"
                : cameraError.startsWith("Step 4 OK")
                  ? "bg-green-900/20 border-green-700/30"
                  : "bg-blue-900/20 border-blue-700/30"
            }`}
          >
            <p
              className={`text-xs text-center font-mono ${
                cameraError.startsWith("FAIL") ||
                cameraError.startsWith("CRASH")
                  ? "text-red-400"
                  : cameraError.startsWith("Step 4 OK")
                    ? "text-green-400"
                    : "text-blue-400"
              }`}
            >
              {cameraError}
            </p>
          </div>
        )}

        <button
          onClick={() => {
            setCameraError("");
            setCameraActive((v) => !v);
          }}
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

        {/* Manual entry */}
        <div className="w-full max-w-sm flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && doScan(input)}
                placeholder="8-digit code e.g. 1E16624F"
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
              {scanning ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Ticket className="w-5 h-5" />
              )}
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
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    n < station.order
                      ? "bg-green-600 text-white"
                      : "bg-purple-600 text-white ring-2 ring-purple-400"
                  }`}
                >
                  {n}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-gray-600 text-xs text-center mt-2">
          Station {station.order}
          {station.isFinal ? " · Final checkpoint" : ""}
        </p>
      </div>
    </div>
  );
}
