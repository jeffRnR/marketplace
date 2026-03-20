"use client";
// app/ticket/[code]/TicketView.tsx

import React, { useEffect, useRef, useCallback, useState } from "react";
import Link from "next/link";
import { CalendarDays, Clock, MapPin, User, CheckCircle, Ticket, Hash, Download, Loader2 } from "lucide-react";
import QRCode from "qrcode";
import NextImage from "next/image";
import logo from "@/images/logo.png";

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

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(null);
    setTimeout(() => resolve(null), 4000);
    img.src = src;
  });
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
      width: 180, margin: 1,
      color: { dark: "#1a1a2e", light: "#ffffff" },
    });
  }, [ticketCode]);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      const W     = 640;
      const PAD   = 32;
      const SCALE = 2;

      const tempCanvas = document.createElement("canvas");
      const tempCtx    = tempCanvas.getContext("2d")!;
      tempCtx.font = "15px -apple-system, BlinkMacSystemFont, sans-serif";
      const venueLines  = wrapText(tempCtx, event.location, W - PAD * 2 - 40);
      const venueExtraH = Math.max(0, (venueLines.length - 1) * 22);

      const IMG_H     = 180;
      const DETAILS_H = 4 * 52 + venueExtraH;
      const BOXES_H   = 110;
      const QTY_H     = quantity > 1 ? 60 : 0;
      const QR_H      = 260;
      const FOOTER_H  = 60;
      const TOTAL_H   = IMG_H + 28 + PAD + DETAILS_H + 20 + 28 + BOXES_H + QTY_H + 28 + QR_H + FOOTER_H;

      const canvas = document.createElement("canvas");
      canvas.width  = W * SCALE;
      canvas.height = TOTAL_H * SCALE;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(SCALE, SCALE);

      ctx.fillStyle = "#0f172a";
      roundRect(ctx, 0, 0, W, TOTAL_H, 24);
      ctx.fill();

      const [eventImg, logoImg, qrImg] = await Promise.all([
        loadImage(event.image),
        loadImage(logo.src),
        (async () => {
          const url = await QRCode.toDataURL(`${window.location.origin}/ticket/${ticketCode}`, {
            width: 200, margin: 2, color: { dark: "#000000", light: "#ffffff" },
          });
          return loadImage(url);
        })(),
      ]);

      // Header image
      ctx.save();
      roundRect(ctx, 0, 0, W, IMG_H, 24);
      ctx.clip();
      if (eventImg) {
        ctx.globalAlpha = 0.4;
        ctx.drawImage(eventImg, 0, 0, W, IMG_H);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(0, 0, W, IMG_H);
      }
      const grad = ctx.createLinearGradient(0, 60, 0, IMG_H);
      grad.addColorStop(0, "rgba(15,23,42,0)");
      grad.addColorStop(1, "rgba(15,23,42,0.97)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, IMG_H);
      ctx.restore();

      // Logo watermark in header
      if (logoImg) {
        const maxLogoW = 160, maxLogoH = 80;
        const ratio = Math.min(maxLogoW / logoImg.width, maxLogoH / logoImg.height);
        const lW = logoImg.width * ratio, lH = logoImg.height * ratio;
        ctx.globalAlpha = 0.30;
        ctx.drawImage(logoImg, (W - lW) / 2, (IMG_H * 0.45 - lH) / 2 + 10, lW, lH);
        ctx.globalAlpha = 1;
      }

      ctx.font      = "bold 12px -apple-system, sans-serif";
      ctx.fillStyle = "#a78bfa";
      ctx.fillText(isRsvp ? "RSVP TICKET" : "TICKET", PAD, IMG_H - 38);
      ctx.font      = "bold 26px -apple-system, sans-serif";
      ctx.fillStyle = "#f8fafc";
      ctx.fillText(event.title.length > 36 ? event.title.slice(0, 36) + "…" : event.title, PAD, IMG_H - 12);

      // Tear line
      let y = IMG_H;
      ctx.save();
      ctx.setLineDash([7, 5]);
      ctx.strokeStyle = "#334155";
      ctx.lineWidth   = 1.5;
      ctx.beginPath(); ctx.moveTo(PAD, y + 14); ctx.lineTo(W - PAD, y + 14); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = "#020617";
      ctx.beginPath(); ctx.arc(0,  y + 14, 13, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(W, y + 14, 13, 0, Math.PI * 2); ctx.fill();
      y += 28;

      // Body logo watermark (large, centred, very faint)
      if (logoImg) {
        const maxW = 320, maxH = 160;
        const ratio = Math.min(maxW / logoImg.width, maxH / logoImg.height);
        const lW = logoImg.width * ratio, lH = logoImg.height * ratio;
        const bodyH = TOTAL_H - IMG_H - 28;
        ctx.globalAlpha = 0.045;
        ctx.drawImage(logoImg, (W - lW) / 2, IMG_H + 28 + (bodyH - lH) / 2, lW, lH);
        ctx.globalAlpha = 1;
      }

      // Details
      y += PAD;
      const details = [
        { emoji: "📅", label: "Date",  value: event.date },
        { emoji: "🕐", label: "Time",  value: event.time },
        { emoji: "📍", label: "Venue", value: event.location },
        { emoji: "👤", label: "Host",  value: event.host },
      ];
      for (const d of details) {
        ctx.font = "18px -apple-system, sans-serif";
        ctx.fillText(d.emoji, PAD, y + 4);
        ctx.font      = "11px -apple-system, sans-serif";
        ctx.fillStyle = "#64748b";
        ctx.fillText(d.label.toUpperCase(), PAD + 32, y - 10);
        ctx.font      = "15px -apple-system, sans-serif";
        ctx.fillStyle = "#e2e8f0";
        if (d.label === "Venue") {
          const lines = wrapText(ctx, d.value, W - PAD * 2 - 40);
          lines.forEach((line, i) => ctx.fillText(line, PAD + 32, y + 6 + i * 22));
          y += lines.length * 22 + 30;
        } else {
          ctx.fillText(d.value, PAD + 32, y + 6);
          y += 52;
        }
      }

      // Divider
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth   = 1.5;
      ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
      ctx.restore();
      y += 24;

      // Boxes
      const boxW = (W - PAD * 2 - 16) / 2;
      const boxH = 100;
      ctx.fillStyle = "#1e293b";
      roundRect(ctx, PAD, y, boxW, boxH, 14); ctx.fill();
      ctx.font = "11px -apple-system, sans-serif"; ctx.fillStyle = "#64748b";
      ctx.fillText("TICKET TYPE", PAD + 14, y + 22);
      ctx.font = "bold 16px -apple-system, sans-serif"; ctx.fillStyle = "#f1f5f9";
      ctx.fillText(ticketType, PAD + 14, y + 50);
      ctx.font = "bold 14px -apple-system, sans-serif";
      ctx.fillStyle = isRsvp ? "#a78bfa" : "#34d399";
      ctx.fillText(isRsvp ? "RSVP" : `KES ${price}`, PAD + 14, y + 76);

      ctx.fillStyle = "#1e293b";
      roundRect(ctx, PAD + boxW + 16, y, boxW, boxH, 14); ctx.fill();
      ctx.font = "11px -apple-system, sans-serif"; ctx.fillStyle = "#64748b";
      ctx.fillText("TICKET HOLDER", PAD + boxW + 16 + 14, y + 22);
      ctx.font = "bold 16px -apple-system, sans-serif"; ctx.fillStyle = "#f1f5f9";
      ctx.fillText(holderName.length > 18 ? holderName.slice(0, 18) + "…" : holderName, PAD + boxW + 16 + 14, y + 50);
      ctx.font = "13px -apple-system, sans-serif"; ctx.fillStyle = "#64748b";
      ctx.fillText(holderEmail.length > 22 ? holderEmail.slice(0, 22) + "…" : holderEmail, PAD + boxW + 16 + 14, y + 74);
      y += boxH + 16;

      if (quantity > 1) {
        ctx.fillStyle = "rgba(46,16,101,0.5)";
        roundRect(ctx, PAD, y, W - PAD * 2, 44, 12); ctx.fill();
        ctx.font = "bold 14px -apple-system, sans-serif"; ctx.fillStyle = "#c4b5fd"; ctx.textAlign = "center";
        ctx.fillText(`× ${quantity} tickets in this order`, W / 2, y + 28);
        ctx.textAlign = "left";
        y += 60;
      }

      ctx.save();
      ctx.setLineDash([6, 4]); ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
      ctx.restore();
      y += 28;

      // QR
      ctx.font = "11px -apple-system, sans-serif"; ctx.fillStyle = "#475569"; ctx.textAlign = "center";
      ctx.fillText("SCAN TO VERIFY", W / 2, y + 14);
      ctx.textAlign = "left";
      y += 26;
      const qrSize = 180, qrX = (W - qrSize - 24) / 2;
      ctx.fillStyle = "#ffffff";
      roundRect(ctx, qrX - 14, y - 14, qrSize + 28, qrSize + 28, 16); ctx.fill();
      if (qrImg) ctx.drawImage(qrImg, qrX, y, qrSize, qrSize);
      y += qrSize + 24;

      ctx.font = "12px 'Courier New', monospace"; ctx.fillStyle = "#334155"; ctx.textAlign = "center";
      ctx.fillText(`# ${ticketCode.slice(0, 8).toUpperCase()}`, W / 2, y);
      y += 20;

      // Bottom logo
      if (logoImg) {
        const maxW = 80, maxH = 36;
        const ratio = Math.min(maxW / logoImg.width, maxH / logoImg.height);
        const lW = logoImg.width * ratio, lH = logoImg.height * ratio;
        ctx.globalAlpha = 0.18;
        ctx.drawImage(logoImg, (W - lW) / 2, y, lW, lH);
        ctx.globalAlpha = 1;
        y += lH + 8;
      }

      ctx.font = "11px 'Courier New', monospace"; ctx.fillStyle = "#1e293b"; ctx.textAlign = "center";
      ctx.fillText(`Order: ${orderId.slice(0, 8).toUpperCase()}`, W / 2, y + 10);
      ctx.textAlign = "left";

      const link = document.createElement("a");
      link.download = `ticket-${ticketCode.slice(0, 8).toUpperCase()}.png`;
      link.href = canvas.toDataURL("image/png");
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

        {/* Display ticket card */}
        <div className="relative bg-gray-900 border border-gray-700/60 rounded-2xl shadow-2xl isolate">

          {/* Logo watermark behind body content */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none -z-10 rounded-2xl overflow-hidden">
            <NextImage
              src={logo}
              alt="watermark"
              className="w-64 opacity-[0.07] object-contain"
            />
          </div>

          {/* Event image header */}
          <div className="relative h-40 overflow-hidden rounded-t-2xl z-10">
            <img src={event.image} alt={event.title} className="w-full h-full object-cover brightness-50" crossOrigin="anonymous" />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
            {/* Logo in header */}
            <div className="absolute inset-0 flex items-center justify-center">
              <NextImage
                src={logo}
                alt="logo"
                className="w-28 opacity-25 object-contain"
              />
            </div>
            <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
              <p className="text-purple-400 text-xs font-semibold uppercase tracking-widest mb-1">
                {isRsvp ? "RSVP Ticket" : "Ticket"}
              </p>
              <h1 className="text-gray-100 font-bold text-xl leading-tight">{event.title}</h1>
            </div>
          </div>

          {/* Tear line */}
          <div className="flex items-center px-5 z-10 relative">
            <div className="w-5 h-5 rounded-full bg-gray-950 -ml-7 shrink-0" />
            <div className="flex-1 border-t-2 border-dashed border-gray-700/60 mx-2" />
            <div className="w-5 h-5 rounded-full bg-gray-950 -mr-7 shrink-0" />
          </div>

          {/* Ticket body */}
          <div className="px-5 py-5 flex flex-col gap-5 relative z-10">
            <div className="grid grid-cols-1 gap-2.5">
              <InfoRow icon={CalendarDays} color="text-purple-400" label="Date"  value={event.date} />
              <InfoRow icon={Clock}        color="text-blue-400"   label="Time"  value={event.time} />
              <InfoRow icon={MapPin}       color="text-red-400"    label="Venue" value={event.location} />
              <InfoRow icon={User}         color="text-amber-400"  label="Host"  value={event.host} />
            </div>
            <div className="border-t border-dashed border-gray-700/60" />
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-3">
                <p className="text-gray-400 text-xs mb-1 flex items-center gap-1"><Ticket className="w-3 h-3" /> Ticket Type</p>
                <p className="text-gray-100 font-bold text-sm">{ticketType}</p>
                <p className={`text-xs font-semibold mt-0.5 ${isRsvp ? "text-purple-400" : "text-green-400"}`}>
                  {isRsvp ? "RSVP" : `KES ${price}`}
                </p>
              </div>
              <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-3">
                <p className="text-gray-400 text-xs mb-1 flex items-center gap-1"><User className="w-3 h-3" /> Ticket Holder</p>
                <p className="text-gray-100 font-bold text-sm truncate">{holderName}</p>
                <p className="text-gray-400 text-xs mt-0.5 truncate">{holderEmail}</p>
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
              <p className="text-gray-500 text-xs font-mono">Order: {orderId.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
        </div>

        {/* Download */}
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 border border-gray-700 hover:border-purple-600 text-gray-300 hover:text-purple-300 font-semibold py-3 rounded-xl transition text-sm"
        >
          {downloading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparing download…</>
            : <><Download className="w-4 h-4" /> Download Ticket</>}
        </button>

        <Link href={`/events/${event.id}`} className="text-center text-gray-600 hover:text-gray-400 text-sm transition">
          ← Back to event
        </Link>
      </div>
    </div>
  );
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