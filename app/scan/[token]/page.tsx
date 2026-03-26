"use client";
// app/scan/[token]/page.tsx
// Token-based scanner interface — works on any device/browser, optimized for phones.

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import {
  QrCode, CheckCircle, XCircle, AlertTriangle, Loader2,
  Keyboard, Camera, Ticket, WifiOff
} from "lucide-react";

// ─── Utilities ───────────────────────────────────────────────────────────────

const isMobile = () => {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionInfo {
  valid: boolean;
  sessionId: string;
  label: string;
  expiresAt: string;
  station: { id: string; name: string; order: number; isFinal: boolean };
  event: { id: number; title: string; date: string; location: string; image: string };
}

type ScanResult =
  | "idle"
  | "loading"
  | "success"
  | "invalid"
  | "already_scanned"
  | "wrong_order"
  | "duplicate_final";

// ─── Result overlay ──────────────────────────────────────────────────────────

function ResultScreen({
  result,
  message,
  ticketType,
  isFinal,
  onReset,
}: {
  result: ScanResult;
  message: string;
  ticketType?: string;
  isFinal?: boolean;
  onReset: () => void;
}) {
  // Auto-reset overlay
  useEffect(() => {
    const timeout = setTimeout(onReset, result === "success" ? 3000 : 4000);
    return () => clearTimeout(timeout);
  }, [result, onReset]);

  const baseClasses = "fixed inset-0 flex flex-col items-center justify-center gap-6 z-50 p-8 text-white";

  if (result === "success")
    return (
      <div className={`${baseClasses} bg-green-600`}>
        <CheckCircle className="w-24 h-24" />
        <div className="text-center">
          <p className="text-4xl font-black mb-2">ADMIT</p>
          {ticketType && <p className="text-xl opacity-80">{ticketType}</p>}
          {isFinal && <p className="text-lg opacity-70 mt-2">Final checkpoint ✓</p>}
          <p className="text-base opacity-60 mt-4">{message}</p>
        </div>
        <p className="text-sm opacity-50">Resetting in 3s…</p>
      </div>
    );

  if (result === "invalid" || result === "duplicate_final")
    return (
      <div className={`${baseClasses} bg-red-600`}>
        <XCircle className="w-24 h-24" />
        <div className="text-center max-w-xs">
          <p className="text-4xl font-black mb-2">DENY</p>
          <p className="text-lg opacity-90 leading-relaxed">{message}</p>
        </div>
        <p className="text-sm opacity-50">Resetting in 4s…</p>
      </div>
    );

  if (result === "already_scanned" || result === "wrong_order")
    return (
      <div className={`${baseClasses} bg-amber-500`}>
        <AlertTriangle className="w-24 h-24" />
        <div className="text-center max-w-xs">
          <p className="text-4xl font-black mb-2">WAIT</p>
          <p className="text-lg opacity-90 leading-relaxed">{message}</p>
        </div>
        <p className="text-sm opacity-70">Resetting in 4s…</p>
      </div>
    );

  return null;
}

// ─── Main scanner page ────────────────────────────────────────────────────────

export default function ScanPage() {
  const { token } = useParams<{ token: string }>();

  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [sessionError, setSessionError] = useState("");
  const [loading, setLoading] = useState(true);

  const [input, setInput] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult>("idle");
  const [message, setMessage] = useState("");
  const [ticketType, setTicketType] = useState("");
  const [isFinal, setIsFinal] = useState(false);
  const [scanning, setScanning] = useState(false);

  const [cameraActive, setCameraActive] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const initializingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load session info
  useEffect(() => {
    fetch(`/api/scan/sessions/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.valid) setSessionInfo(data);
        else setSessionError(data.error ?? "Invalid link");
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
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const doScan = useCallback(
    async (code: string) => {
      const clean = code.trim().toUpperCase();
      if (!clean || !sessionInfo) return;
      setScanning(true);
      setScanResult("loading");

      try {
        const res = await fetch("/api/scan/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, ticketCode: clean }),
        });
        const data = await res.json();

        // Always show reason for rejection
        setScanResult(data.result as ScanResult);
        setMessage(data.message ?? "Unknown reason");
        setTicketType(data.ticketType ?? "");
        setIsFinal(data.isFinal ?? false);

        if (data.result === "success") setCameraActive(false);
      } catch {
        setScanResult("invalid");
        setMessage("Network error. Try again.");
      } finally {
        setScanning(false);
      }
    },
    [sessionInfo, token]
  );

  // Camera initialization
  useEffect(() => {
    if (!cameraActive) {
      if (scannerRef.current && !initializingRef.current) {
        try {
          scannerRef.current.stop();
          scannerRef.current.clear();
          scannerRef.current = null;
        } catch {}
      }
      return;
    }

    const initCamera = async () => {
      if (initializingRef.current || scannerRef.current) return;
      initializingRef.current = true;

      try {
        const mobile = isMobile();
        scannerRef.current = new Html5Qrcode("qr-reader");

        const constraints = { facingMode: mobile ? "environment" : "environment" };

        await scannerRef.current.start(
          constraints,
          { fps: 10, qrbox: mobile ? { width: 200, height: 200 } : { width: 250, height: 250 } },
          (decodedText) => {
            setCameraActive(false);
            setInput(decodedText);
            doScan(decodedText);
          },
          (error) => console.log("QR scan error:", error)
        );
      } catch (error) {
        const isPermissionDenied =
          error instanceof DOMException &&
          (error.name === "NotAllowedError" || error.name === "PermissionDeniedError");

        setScanResult("invalid");
        setMessage(
          isPermissionDenied
            ? "Camera permission denied. Enable camera in settings and refresh."
            : `Camera failed: ${error instanceof Error ? error.message : "Unknown error"}.`
        );
        setCameraActive(false);
        scannerRef.current = null;
      } finally {
        initializingRef.current = false;
      }
    };

    initCamera();

    return () => {
      if (scannerRef.current && !initializingRef.current) {
        try {
          scannerRef.current.stop();
          scannerRef.current.clear();
          scannerRef.current = null;
        } catch {}
      }
    };
  }, [cameraActive, doScan]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") doScan(input);
  };

  // ── Loading / error UI ────────────────────────────────────────────────

  if (loading)
    return (
      <div className="p-4 lg:w-[70%] mt-14 mx-auto w-full min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );

  if (sessionError)
    return (
      <div className="p-4 lg:w-[70%] mt-14 mx-auto w-full min-h-screen flex flex-col items-center justify-center gap-4 text-center">
        <WifiOff className="w-16 h-16 text-red-400" />
        <p className="text-white font-black text-2xl">Scanner Unavailable</p>
        <p className="text-gray-400">{sessionError}</p>
      </div>
    );

  if (!sessionInfo) return null;

  const { station, event } = sessionInfo;
  const expiresIn = Math.max(
    0,
    Math.round((new Date(sessionInfo.expiresAt).getTime() - Date.now()) / 60000)
  );

  // ── Main UI ───────────────────────────────────────────────────────────────

  return (
    <div className="p-4 lg:w-[70%] mt-14 mx-auto w-full min-h-screen flex flex-col gap-6">
      {scanResult !== "idle" && scanResult !== "loading" && (
        <ResultScreen
          result={scanResult}
          message={message}
          ticketType={ticketType}
          isFinal={isFinal}
          onReset={resetScan}
        />
      )}

      {/* Header */}
      <div className="p-4 rounded-2xl border bg-gray-900/30 border-gray-800">
        <div className="flex sm:items-center justify-between mb-2 flex-col sm:flex-row">
          <div className="flex items-center gap-2">
            <p className="text-gray-200 font-black text-lg">{station.name}</p>
            {station.isFinal && (
              <span className="text-xs bg-green-400/30 text-gray-200 px-4 py-0.5 rounded-full font-semibold">
                Final
              </span>
            )}
          </div>
          <p className="text-gray-500 text-xs">
            Expires in {expiresIn >= 60 ? `${Math.floor(expiresIn / 60)}h` : `${expiresIn}m`}
          </p>
        </div>
        <p className="text-gray-400 text-sm font-semibold truncate">{event.title}</p>
        <p className="text-gray-500 text-xs">
          {sessionInfo.label} · Station {station.order}
        </p>
      </div>

      {/* Scanner & Input */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <div
          className="w-full sm:w-72 md:w-80 aspect-square border-2 rounded-2xl overflow-hidden"
          style={{
            borderColor: cameraActive ? "#a855f7" : "#374151",
            borderStyle: cameraActive ? "solid" : "dashed",
          }}
        >
          <div id="qr-reader" className="w-full h-full">
            {!cameraActive && (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-gray-600 bg-gray-800/50">
                <QrCode className="w-12 h-12 sm:w-16 sm:h-16" />
                <p className="text-xs sm:text-sm text-center px-4">
                  Point camera at QR code <br /> or type ticket number below
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3 flex-wrap justify-center">
          <button
            onClick={() => setCameraActive(!cameraActive)}
            disabled={scanning}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 text-sm ${
              cameraActive
                ? "bg-red-600/30 hover:bg-red-700/30 text-gray-200"
                : "bg-purple-600 hover:bg-purple-700 text-gray-200"
            } disabled:opacity-50`}
          >
            <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
            {cameraActive ? "Stop Camera" : "Start Camera"}
          </button>
        </div>

        {/* Ticket input */}
        <div className="w-full max-w-sm flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                placeholder="Ticket code…"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
                className="w-full bg-gray-900/60 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white text-sm sm:text-base font-mono focus:outline-none focus:border-purple-500 focus:bg-gray-900 uppercase tracking-wider"
              />
            </div>
            <button
              onClick={() => doScan(input)}
              disabled={!input.trim() || scanning}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold px-3 sm:px-5 py-3 rounded-xl transition flex items-center gap-2"
            >
              {scanning ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Ticket className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          </div>
          <p className="text-gray-600 text-xs text-center">
            Press Enter or tap the button to scan · Camera auto-scans QR codes
          </p>
        </div>
      </div>

      {/* Footer — station order */}
      <div className="p-4 rounded-2xl bg-gray-900/40 border border-gray-800">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {Array.from({ length: station.order + 1 }).map((_, i) => {
            if (i === 0) return null;
            return (
              <div key={i} className="flex items-center gap-2">
                {i > 1 && <div className="w-6 h-px bg-gray-700" />}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i < station.order
                      ? "bg-green-600 text-white"
                      : i === station.order
                      ? "bg-purple-600 text-white ring-2 ring-purple-400"
                      : "bg-gray-700 text-gray-500"
                  }`}
                >
                  {i}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-gray-600 text-xs text-center mt-2">
          Station {station.order} of {station.order + (station.isFinal ? 0 : 1)}+
        </p>
      </div>
    </div>
  );
}