"use client";
// app/scan/[token]/page.tsx
// Scanner interface — no login required, token-based access.
// Works on any device/browser. Optimised for phone use.

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Html5QrcodeScanner } from "html5-qrcode";
import {
  QrCode, CheckCircle, XCircle, AlertTriangle, Loader2,
  Keyboard, Camera, RotateCcw, Wifi, WifiOff, Ticket,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionInfo {
  valid:     boolean;
  sessionId: string;
  label:     string;
  expiresAt: string;
  station:   { id: string; name: string; order: number; isFinal: boolean };
  event:     { id: number; title: string; date: string; location: string; image: string };
}

type ScanResult = "idle" | "loading" | "success" | "invalid" | "already_scanned" | "wrong_order" | "duplicate_final";

// ─── Scan result screen ───────────────────────────────────────────────────────

function ResultScreen({
  result, message, ticketType, isFinal, onReset,
}: {
  result: ScanResult; message: string; ticketType?: string;
  isFinal?: boolean; onReset: () => void;
}) {
  // Auto-reset after 3s on success, 4s on others
  useEffect(() => {
    const t = setTimeout(onReset, result === "success" ? 3000 : 4000);
    return () => clearTimeout(t);
  }, [result, onReset]);

  if (result === "success") return (
    <div className="fixed inset-0 bg-green-600 flex flex-col items-center justify-center gap-6 z-50 text-white p-8">
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

  if (result === "duplicate_final" || result === "invalid") return (
    <div className="fixed inset-0 bg-red-600 flex flex-col items-center justify-center gap-6 z-50 text-white p-8">
      <XCircle className="w-24 h-24" />
      <div className="text-center">
        <p className="text-4xl font-black mb-2">DENY</p>
        <p className="text-lg opacity-80">{result === "invalid" ? "Invalid ticket" : "Already admitted"}</p>
      </div>
      <p className="text-sm opacity-50">Resetting in 4s…</p>
    </div>
  );

  if (result === "already_scanned" || result === "wrong_order") return (
    <div className="fixed inset-0 bg-amber-500 flex flex-col items-center justify-center gap-6 z-50 text-white p-8">
      <AlertTriangle className="w-24 h-24" />
      <div className="text-center">
        <p className="text-4xl font-black mb-2">WAIT</p>
        <p className="text-lg opacity-90 text-center leading-relaxed">{message}</p>
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

  const [input,      setInput]      = useState("");
  const [scanResult, setScanResult] = useState<ScanResult>("idle");
  const [message,    setMessage]    = useState("");
  const [ticketType, setTicketType] = useState("");
  const [isFinal,    setIsFinal]    = useState(false);
  const [scanning,   setScanning]   = useState(false);

  const [cameraActive, setCameraActive] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
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
    setMessage(""); setInput(""); setTicketType(""); setIsFinal(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const doScan = useCallback(async (code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean || !sessionInfo) return;
    setScanning(true); setScanResult("loading");

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
      
      // Auto-close camera on success
      if (data.result === "success") {
        setCameraActive(false);
      }
    } catch {
      setScanResult("invalid");
      setMessage("Network error. Try again.");
    } finally {
      setScanning(false);
    }
  }, [sessionInfo, token]);

  // Handle camera initialization and cleanup
  useEffect(() => {
    if (!cameraActive) {
      // Stop and cleanup scanner
      if (scannerRef.current && !initializingRef.current) {
        try {
          scannerRef.current.clear().catch(() => {});
          scannerRef.current = null;
        } catch (error) {
          console.error("Error stopping scanner:", error);
          scannerRef.current = null;
        }
      }
      return;
    }

    // Start camera
    const initCamera = async () => {
      if (initializingRef.current || scannerRef.current) return;
      
      initializingRef.current = true;
      try {
        scannerRef.current = new Html5QrcodeScanner(
          "qr-reader",
          { fps: 10, qrbox: { width: 250, height: 250 } },
          false
        );
        
        // Don't await render - it may not return a promise in all versions
        scannerRef.current.render(
          (decodedText) => {
            // Auto-stop on scan
            setCameraActive(false);
            setInput(decodedText);
            doScan(decodedText);
          },
          (error) => {
            console.log("QR scan error:", error);
          }
        );
      } catch (error) {
        console.error("Failed to start camera:", error);
        setScanResult("invalid");
        setMessage("Camera access denied or not available.");
        setCameraActive(false);
        scannerRef.current = null;
      } finally {
        initializingRef.current = false;
      }
    };

    initCamera();

    // Cleanup on unmount or cameraActive change
    return () => {
      if (scannerRef.current && !initializingRef.current) {
        try {
          scannerRef.current.clear().catch(() => {});
          scannerRef.current = null;
        } catch {}
      }
    };
  }, [cameraActive, doScan]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { doScan(input); }
  }

  // ── Loading / error states ─────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
    </div>
  );

  if (sessionError) return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 p-8 text-center">
      <WifiOff className="w-16 h-16 text-red-400" />
      <p className="text-white font-black text-2xl">Scanner Unavailable</p>
      <p className="text-gray-400">{sessionError}</p>
    </div>
  );

  if (!sessionInfo) return null;

  const { station, event } = sessionInfo;
  const expiresIn = Math.max(0, Math.round((new Date(sessionInfo.expiresAt).getTime() - Date.now()) / 60000));

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">

      {/* Scan result overlay */}
      {scanResult !== "idle" && scanResult !== "loading" && (
        <ResultScreen
          result={scanResult} message={message}
          ticketType={ticketType} isFinal={isFinal}
          onReset={resetScan}
        />
      )}

      {/* Header */}
      <div className={`p-4 border-b border-gray-800 ${station.isFinal ? "bg-purple-950/40" : "bg-gray-900"}`}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${expiresIn > 30 ? "bg-green-400" : "bg-amber-400"}`} />
            <p className="text-white font-black text-lg">{station.name}</p>
            {station.isFinal && (
              <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full font-semibold">Final</span>
            )}
          </div>
          <p className="text-gray-500 text-xs">
            Expires in {expiresIn >= 60 ? `${Math.floor(expiresIn/60)}h` : `${expiresIn}m`}
          </p>
        </div>
        <p className="text-gray-400 text-sm truncate">{event.title}</p>
        <p className="text-gray-600 text-xs mt-0.5">{sessionInfo.label} · Station {station.order}</p>
      </div>

      {/* Main scan area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">

        {/* Camera scanner area */}
        <div className="w-64 h-64 border-2 rounded-2xl overflow-hidden" style={{ borderColor: cameraActive ? '#a855f7' : '#374151', borderStyle: cameraActive ? 'solid' : 'dashed' }}>
          <div id="qr-reader" className="w-full h-full">
            {!cameraActive && (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-gray-600">
                <QrCode className="w-16 h-16" />
                <p className="text-sm text-center px-4">Point camera at QR code<br/>or type ticket number below</p>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          <button
            onClick={() => setCameraActive(!cameraActive)}
            disabled={scanning}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 ${
              cameraActive ? "bg-red-600 hover:bg-red-700 text-white" : "bg-purple-600 hover:bg-purple-700 text-white"
            } disabled:opacity-50`}
          >
            <Camera className="w-5 h-5" />
            {cameraActive ? "Stop Camera" : "Start Camera"}
          </button>
        </div>

        {/* Ticket code input */}
        <div className="w-full max-w-sm flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                placeholder="Ticket code…"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-3.5 text-white font-mono text-base focus:outline-none focus:border-purple-500 uppercase tracking-wider"
              />
            </div>
            <button
              onClick={() => doScan(input)}
              disabled={!input.trim() || scanning}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold px-5 rounded-xl transition flex items-center gap-2"
            >
              {scanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Ticket className="w-5 h-5" />}
            </button>
          </div>

          <p className="text-gray-600 text-xs text-center">
            Press Enter or tap the button to scan · Camera auto-scans QR codes
          </p>
        </div>
      </div>

      {/* Footer — station order indicator */}
      <div className="p-4 border-t border-gray-800 bg-gray-900">
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: station.order + 1 }).map((_, i) => {
            if (i === 0) return null;
            return (
              <div key={i} className="flex items-center gap-2">
                {i > 1 && <div className="w-6 h-px bg-gray-700" />}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  i < station.order ? "bg-green-600 text-white"
                  : i === station.order ? "bg-purple-600 text-white ring-2 ring-purple-400"
                  : "bg-gray-700 text-gray-500"
                }`}>
                  {i}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-gray-600 text-xs text-center mt-2">Station {station.order} of {station.order + (station.isFinal ? 0 : 1)}+</p>
      </div>
    </div>
  );
}