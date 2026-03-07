"use client";
// app/ticket/[code]/TicketView.tsx

import React, { useEffect, useRef, useCallback, useState } from "react";
import Link from "next/link";
import { CalendarDays, Clock, MapPin, User, CheckCircle, Ticket, Hash, Download, Loader2 } from "lucide-react";
import QRCode from "qrcode";

interface TicketViewProps {
  ticketCode:  string;
  ticketType:  string;
  price:       string;
  quantity:    number;
  holderName:  string;
  holderEmail: string;
  isRsvp:      boolean;
  orderId:     string;
  status:      string;
  event: {
    id:       number;
    title:    string;
    date:     string;
    time:     string;
    location: string;
    host:     string;
    image:    string;
  };
}

export default function TicketView({
  ticketCode, ticketType, price, quantity, holderName,
  holderEmail, isRsvp, orderId, status, event,
}: TicketViewProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ticketUrl = `${window.location.origin}/ticket/${ticketCode}`;
    QRCode.toCanvas(canvasRef.current, ticketUrl, {
      width:  180,
      margin: 1,
      color:  { dark: "#1a1a2e", light: "#ffffff" },
    });
  }, [ticketCode]);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      const domtoimage = (await import("dom-to-image-more")).default;

      // Generate QR code as data URL for the offline card
      const ticketUrl = `${window.location.origin}/ticket/${ticketCode}`;
      const qrDataUrl = await QRCode.toDataURL(ticketUrl, {
        width:  200,
        margin: 1,
        color:  { dark: "#000000", light: "#ffffff" },
      });

      // Build a fully inline-styled card — no Tailwind, no CSS vars, no outlines
      const card = document.createElement("div");
      card.style.cssText = `
        width: 480px;
        background: #111827;
        border-radius: 20px;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        position: fixed;
        left: -9999px;
        top: 0;
      `;

      card.innerHTML = `
        <!-- Header image -->
        <div style="position:relative;height:160px;overflow:hidden;background:#0f172a;">
          <img src="${event.image}" crossorigin="anonymous"
            style="width:100%;height:100%;object-fit:cover;opacity:0.5;display:block;" />
          <div style="position:absolute;inset:0;background:linear-gradient(to top,#111827 0%,transparent 60%);"></div>
          <div style="position:absolute;bottom:0;left:0;right:0;padding:0 20px 16px;">
            <p style="color:#a78bfa;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 4px;">
              ${isRsvp ? "RSVP Ticket" : "Ticket"}
            </p>
            <h1 style="color:#f1f5f9;font-size:20px;font-weight:800;margin:0;line-height:1.2;">
              ${event.title}
            </h1>
          </div>
        </div>

        <!-- Dashed separator -->
        <div style="display:flex;align-items:center;padding:0 20px;margin:0 -1px;">
          <div style="width:20px;height:20px;border-radius:50%;background:#030712;margin-left:-28px;flex-shrink:0;"></div>
          <div style="flex:1;border-top:2px dashed #374151;margin:0 8px;"></div>
          <div style="width:20px;height:20px;border-radius:50%;background:#030712;margin-right:-28px;flex-shrink:0;"></div>
        </div>

        <!-- Body -->
        <div style="padding:20px 24px;display:flex;flex-direction:column;gap:20px;">

          <!-- Event details -->
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${row("📅", "#a78bfa", "Date",  event.date)}
            ${row("🕐", "#60a5fa", "Time",  event.time)}
            ${row("📍", "#f87171", "Venue", event.location)}
            ${row("👤", "#fbbf24", "Host",  event.host)}
          </div>

          <!-- Dashed separator -->
          <div style="border-top:1px dashed #374151;"></div>

          <!-- Ticket type + holder -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div style="background:#1e293b;border-radius:12px;padding:12px;">
              <p style="color:#6b7280;font-size:11px;margin:0 0 4px;">🎫 Ticket Type</p>
              <p style="color:#e2e8f0;font-weight:700;font-size:14px;margin:0;">${ticketType}</p>
              <p style="color:${isRsvp ? "#a78bfa" : "#34d399"};font-size:12px;font-weight:600;margin:4px 0 0;">
                ${isRsvp ? "Free" : `KES ${price}`}
              </p>
            </div>
            <div style="background:#1e293b;border-radius:12px;padding:12px;">
              <p style="color:#6b7280;font-size:11px;margin:0 0 4px;">👤 Ticket Holder</p>
              <p style="color:#e2e8f0;font-weight:700;font-size:14px;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${holderName}</p>
              <p style="color:#6b7280;font-size:11px;margin:4px 0 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${holderEmail}</p>
            </div>
          </div>

          ${quantity > 1 ? `
          <div style="background:#2e1065;border-radius:12px;padding:12px;text-align:center;">
            <p style="color:#c4b5fd;font-size:14px;font-weight:600;margin:0;">× ${quantity} tickets in this order</p>
          </div>` : ""}

          <!-- Dashed separator -->
          <div style="border-top:1px dashed #374151;"></div>

          <!-- QR code -->
          <div style="display:flex;flex-direction:column;align-items:center;gap:12px;">
            <p style="color:#6b7280;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0;">Scan to verify</p>
            <div style="background:#fff;padding:12px;border-radius:12px;">
              <img src="${qrDataUrl}" style="width:180px;height:180px;display:block;" />
            </div>
            <p style="color:#4b5563;font-size:11px;font-family:monospace;margin:0;">
              # ${ticketCode.slice(0, 8).toUpperCase()}…
            </p>
          </div>

          <!-- Order ID -->
          <div style="text-align:center;padding-bottom:4px;">
            <p style="color:#374151;font-size:11px;font-family:monospace;margin:0;">
              Order: ${orderId.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </div>
      `;

      document.body.appendChild(card);

      // Wait a tick for images to start loading
      await new Promise((r) => setTimeout(r, 300));

      const dataUrl = await domtoimage.toPng(card, {
        quality: 1,
        scale:   2,
        bgcolor: "#111827",
      });

      document.body.removeChild(card);

      const link = document.createElement("a");
      link.download = `ticket-${ticketCode.slice(0, 8).toUpperCase()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloading(false);
    }
  }, [ticketCode, event, ticketType, price, holderName, holderEmail, isRsvp, orderId, quantity]);

  const isValid = status === "confirmed";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-gray-950">
      <div className="w-full max-w-md flex flex-col gap-4">

        {/* Status banner */}
        <div className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold ${
          isValid
            ? "bg-green-900/30 border border-green-700/50 text-green-400"
            : "bg-red-900/30 border border-red-700/50 text-red-400"
        }`}>
          <CheckCircle className="w-4 h-4" />
          {isValid ? "Valid ticket — present this at the entrance" : "This ticket is no longer valid"}
        </div>

        {/* Main ticket card (display only) */}
        <div className="bg-gray-900 border border-gray-700/60 rounded-2xl overflow-hidden shadow-2xl">

          <div className="relative h-40 overflow-hidden">
            <img src={event.image} alt={event.title} className="w-full h-full object-cover brightness-50" crossOrigin="anonymous" />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
              <p className="text-purple-400 text-xs font-semibold uppercase tracking-widest mb-1">
                {isRsvp ? "RSVP Ticket" : "Ticket"}
              </p>
              <h1 className="text-gray-100 font-bold text-xl leading-tight">{event.title}</h1>
            </div>
          </div>

          <div className="flex items-center px-5">
            <div className="w-5 h-5 rounded-full bg-gray-950 -ml-7 shrink-0" />
            <div className="flex-1 border-t-2 border-dashed border-gray-700/60 mx-2" />
            <div className="w-5 h-5 rounded-full bg-gray-950 -mr-7 shrink-0" />
          </div>

          <div className="px-5 py-5 flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-2.5">
              <InfoRow icon={CalendarDays} color="text-purple-400" label="Date"  value={event.date} />
              <InfoRow icon={Clock}        color="text-blue-400"   label="Time"  value={event.time} />
              <InfoRow icon={MapPin}       color="text-red-400"    label="Venue" value={event.location} />
              <InfoRow icon={User}         color="text-amber-400"  label="Host"  value={event.host} />
            </div>

            <div className="border-t border-dashed border-gray-700/60" />

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-3">
                <p className="text-gray-500 text-xs mb-1 flex items-center gap-1"><Ticket className="w-3 h-3" /> Ticket Type</p>
                <p className="text-gray-200 font-bold text-sm">{ticketType}</p>
                <p className={`text-xs font-semibold mt-0.5 ${isRsvp ? "text-purple-400" : "text-green-400"}`}>
                  {isRsvp ? "Free" : `KES ${price}`}
                </p>
              </div>
              <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-3">
                <p className="text-gray-500 text-xs mb-1 flex items-center gap-1"><User className="w-3 h-3" /> Ticket Holder</p>
                <p className="text-gray-200 font-bold text-sm truncate">{holderName}</p>
                <p className="text-gray-500 text-xs mt-0.5 truncate">{holderEmail}</p>
              </div>
            </div>

            {quantity > 1 && (
              <div className="bg-purple-900/20 border border-purple-700/30 rounded-xl px-4 py-3 text-center">
                <p className="text-purple-300 text-sm font-semibold">× {quantity} tickets in this order</p>
              </div>
            )}

            <div className="border-t border-dashed border-gray-700/60" />

            <div className="flex flex-col items-center gap-3">
              <p className="text-gray-500 text-xs uppercase tracking-widest">Scan to verify</p>
              <div className="bg-white p-3 rounded-xl shadow-lg">
                <canvas ref={canvasRef} />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <Hash className="w-3 h-3" />
                <span className="font-mono">{ticketCode.slice(0, 8).toUpperCase()}…</span>
              </div>
            </div>

            <div className="text-center pt-1">
              <p className="text-gray-700 text-xs font-mono">Order: {orderId.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
        </div>

        {/* Download button */}
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 border border-gray-700 hover:border-purple-600 text-gray-300 hover:text-purple-300 font-semibold py-3 rounded-xl transition text-sm"
        >
          {downloading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparing download…</>
            : <><Download className="w-4 h-4" /> Download Ticket</>
          }
        </button>

        <Link href={`/events/${event.id}`}
          className="text-center text-gray-600 hover:text-gray-400 text-sm transition">
          ← Back to event
        </Link>
      </div>
    </div>
  );
}

// Helper to build inline HTML rows for the download card
function row(emoji: string, color: string, label: string, value: string) {
  return `
    <div style="display:flex;align-items:flex-start;gap:10px;">
      <span style="font-size:14px;margin-top:2px;">${emoji}</span>
      <div>
        <p style="color:#6b7280;font-size:11px;margin:0;">${label}</p>
        <p style="color:#cbd5e1;font-size:13px;font-weight:500;margin:2px 0 0;line-height:1.3;">${value}</p>
      </div>
    </div>`;
}

function InfoRow({ icon: Icon, color, label, value }: {
  icon: React.ElementType; color: string; label: string; value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${color}`} />
      <div className="min-w-0">
        <p className="text-gray-600 text-xs">{label}</p>
        <p className="text-gray-300 text-sm font-medium leading-tight">{value}</p>
      </div>
    </div>
  );
}