"use client";
// app/ticket/[code]/TicketView.tsx

import React, { useEffect, useRef, useCallback, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  MapPin,
  User,
  CheckCircle,
  Ticket,
  Hash,
  Download,
  Loader2,
  CircleAlert,
} from "lucide-react";
import QRCode from "qrcode";
import NextImage from "next/image";
import logo from "@/images/logo.png";
import {
  getEventThemeStyle,
  getEventTicketThemeColors,
  safeEventAccentColor,
  safeEventTicketTheme,
} from "@/lib/eventAppearance";

interface TicketViewProps {
  ticketCode: string;
  ticketType: string;
  price: string;
  quantity: number;
  holderName: string;
  holderEmail: string;
  isRsvp: boolean;
  orderId: string;
  status: string;
  event: {
    id: string;
    title: string;
    date: string;
    time: string;
    location: string;
    host: string;
    image: string;
    accentColor: string;
    ticketStyle: "classic" | "minimal";
    ticketTheme: string;
    listingCurrency: "KES" | "USDC";
  };
}

// Canvas helpers

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
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

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
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
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    setTimeout(() => resolve(null), 4000);
    img.src = src;
  });
}

// Main component

export default function TicketView({
  ticketCode,
  ticketType,
  price,
  quantity,
  holderName,
  holderEmail,
  isRsvp,
  orderId,
  status,
  event,
}: TicketViewProps) {
  const accentColor = safeEventAccentColor(event.accentColor);
  const minimal = event.ticketStyle === "minimal";
  const ticketTheme = safeEventTicketTheme(event.ticketTheme);
  const themeColors = getEventTicketThemeColors(ticketTheme);
  const qrPx = minimal ? 180 : 220;
  const innerRadius = minimal ? "rounded-sm" : "rounded-xl";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [signedPayload, setSignedPayload] = useState<string | null>(null);
  const [sigError, setSigError] = useState(false);

  // Fetch the signed QR payload from the server. Never expose the signing secret client side.
  useEffect(() => {
    fetch(`/api/ticket/sign?code=${ticketCode}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.signed) setSignedPayload(data.signed);
        else setSigError(true);
      })
      .catch(() => setSigError(true));
  }, [ticketCode]);

  // Render the QR once the signed payload is ready
  useEffect(() => {
    if (!canvasRef.current || !signedPayload) return;
    QRCode.toCanvas(canvasRef.current, signedPayload, {
      width: qrPx,
      margin: 1,
      color: { dark: "#1a1a2e", light: "#ffffff" },
    });
  }, [signedPayload, qrPx]);

  const handleDownload = useCallback(async () => {
    if (!signedPayload) return;
    setDownloading(true);
    try {
      const W = 640;
      const PAD = 32;
      const SCALE = 2;
      const CARD_R = minimal ? 6 : 24;
      const BOX_R = minimal ? 4 : 14;
      const f = (spec: string) => `${spec} ${themeColors.font}`;

      const tempCtx = document.createElement("canvas").getContext("2d")!;
      tempCtx.font = f("15px");
      const venueLines = wrapText(tempCtx, event.location, W - PAD * 2 - 40);
      const venueExtraH = Math.max(0, (venueLines.length - 1) * 22);

      const IMG_H = minimal ? 130 : 180;
      const DETAILS_H = 4 * 52 + venueExtraH;
      const BOXES_H = 110;
      const QTY_H = quantity > 1 ? 60 : 0;
      const QR_H = 260;
      const FOOTER_H = 60;
      const TOTAL_H =
        IMG_H + 28 + PAD + DETAILS_H + 20 + 28 + BOXES_H + QTY_H + 28 + QR_H + FOOTER_H;

      const canvas = document.createElement("canvas");
      canvas.width = W * SCALE;
      canvas.height = TOTAL_H * SCALE;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(SCALE, SCALE);

      const bg = ctx.createLinearGradient(0, 0, W * 0.4, TOTAL_H);
      bg.addColorStop(0, themeColors.panelRaised);
      bg.addColorStop(1, themeColors.card);
      ctx.fillStyle = bg;
      roundRect(ctx, 0, 0, W, TOTAL_H, CARD_R);
      ctx.fill();

      const [eventImg, logoImg, qrImg] = await Promise.all([
        loadImage(event.image),
        loadImage(logo.src),
        QRCode.toDataURL(signedPayload, {
          width: 200,
          margin: 2,
          color: { dark: "#000000", light: "#ffffff" },
        }).then(loadImage),
      ]);

      // Header image
      ctx.save();
      roundRect(ctx, 0, 0, W, IMG_H, CARD_R);
      ctx.clip();
      if (eventImg) {
        ctx.globalAlpha = 0.4;
        ctx.drawImage(eventImg, 0, 0, W, IMG_H);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = themeColors.panelRaised;
        ctx.fillRect(0, 0, W, IMG_H);
      }
      const grad = ctx.createLinearGradient(0, 60, 0, IMG_H);
      grad.addColorStop(0, themeColors.overlayStart);
      grad.addColorStop(1, themeColors.overlayEnd);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, IMG_H);
      ctx.restore();

      if (logoImg) {
        const ratio = Math.min(160 / logoImg.width, 80 / logoImg.height);
        const lW = logoImg.width * ratio;
        const lH = logoImg.height * ratio;
        ctx.globalAlpha = 0.3;
        ctx.drawImage(logoImg, (W - lW) / 2, (IMG_H * 0.45 - lH) / 2 + 10, lW, lH);
        ctx.globalAlpha = 1;
      }

      ctx.font = f("bold 12px");
      ctx.fillStyle = accentColor;
      ctx.fillText(isRsvp ? "RSVP TICKET" : "TICKET", PAD, IMG_H - 38);
      ctx.font = f("bold 26px");
      ctx.fillStyle = "#f8fafc";
      ctx.fillText(
        event.title.length > 36 ? event.title.slice(0, 36) + "…" : event.title,
        PAD,
        IMG_H - 12,
      );

      // Tear line
      let y = IMG_H;
      ctx.save();
      ctx.setLineDash([7, 5]);
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(PAD, y + 14);
      ctx.lineTo(W - PAD, y + 14);
      ctx.stroke();
      ctx.restore();
      if (!minimal) {
        ctx.fillStyle = themeColors.panel;
        for (const cx of [0, W]) {
          ctx.beginPath();
          ctx.arc(cx, y + 14, 13, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      y += 28;

      // Body watermark
      if (logoImg) {
        const ratio = Math.min(320 / logoImg.width, 160 / logoImg.height);
        const lW = logoImg.width * ratio;
        const lH = logoImg.height * ratio;
        const bodyH = TOTAL_H - IMG_H - 28;
        ctx.globalAlpha = 0.045;
        ctx.drawImage(logoImg, (W - lW) / 2, IMG_H + 28 + (bodyH - lH) / 2, lW, lH);
        ctx.globalAlpha = 1;
      }

      y += PAD;
      const details = [
        { emoji: "📅", label: "Date", value: event.date },
        { emoji: "🕐", label: "Time", value: event.time },
        { emoji: "📍", label: "Venue", value: event.location },
        { emoji: "👤", label: "Host", value: event.host },
      ];
      for (const d of details) {
        ctx.font = f("18px");
        ctx.fillText(d.emoji, PAD, y + 4);
        ctx.font = f("11px");
        ctx.fillStyle = themeColors.muted;
        ctx.fillText(d.label.toUpperCase(), PAD + 32, y - 10);
        ctx.font = f("15px");
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

      const dashedRule = () => {
        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = themeColors.border;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(PAD, y);
        ctx.lineTo(W - PAD, y);
        ctx.stroke();
        ctx.restore();
      };

      dashedRule();
      y += 24;

      const boxW = (W - PAD * 2 - 16) / 2;
      const boxH = 100;
      const holderX = PAD + boxW + 16;

      ctx.fillStyle = themeColors.panelRaised;
      roundRect(ctx, PAD, y, boxW, boxH, BOX_R);
      ctx.fill();
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = f("11px");
      ctx.fillStyle = themeColors.muted;
      ctx.fillText("TICKET TYPE", PAD + 14, y + 22);
      ctx.font = f("bold 16px");
      ctx.fillStyle = "#f1f5f9";
      ctx.fillText(ticketType, PAD + 14, y + 50);
      ctx.font = f("bold 14px");
      ctx.fillStyle = isRsvp ? accentColor : "#34d399";
      ctx.fillText(isRsvp ? "RSVP" : `${event.listingCurrency} ${price}`, PAD + 14, y + 76);

      ctx.fillStyle = themeColors.panelRaised;
      roundRect(ctx, holderX, y, boxW, boxH, BOX_R);
      ctx.fill();
      ctx.font = f("11px");
      ctx.fillStyle = themeColors.muted;
      ctx.fillText("TICKET HOLDER", holderX + 14, y + 22);
      ctx.font = f("bold 16px");
      ctx.fillStyle = "#f1f5f9";
      ctx.fillText(
        holderName.length > 18 ? holderName.slice(0, 18) + "…" : holderName,
        holderX + 14,
        y + 50,
      );
      ctx.font = f("13px");
      ctx.fillStyle = themeColors.muted;
      ctx.fillText(
        holderEmail.length > 22 ? holderEmail.slice(0, 22) + "…" : holderEmail,
        holderX + 14,
        y + 74,
      );
      y += boxH + 16;

      if (quantity > 1) {
        ctx.fillStyle = "rgba(46,16,101,0.5)";
        roundRect(ctx, PAD, y, W - PAD * 2, 44, minimal ? 4 : 12);
        ctx.fill();
        ctx.font = f("bold 14px");
        ctx.fillStyle = accentColor;
        ctx.textAlign = "center";
        ctx.fillText(`× ${quantity} tickets in this order`, W / 2, y + 28);
        ctx.textAlign = "left";
        y += 60;
      }

      dashedRule();
      y += 28;

      ctx.font = f("11px");
      ctx.fillStyle = themeColors.muted;
      ctx.textAlign = "center";
      ctx.fillText("SCAN TO VERIFY", W / 2, y + 14);
      y += 26;

      const qrSize = 180;
      const qrX = (W - qrSize) / 2;
      ctx.fillStyle = "#ffffff";
      roundRect(ctx, qrX - 14, y - 14, qrSize + 28, qrSize + 28, minimal ? 6 : 16);
      ctx.fill();
      if (qrImg) ctx.drawImage(qrImg, qrX, y, qrSize, qrSize);
      y += qrSize + 24;

      ctx.font = f("11px");
      ctx.fillStyle = themeColors.muted;
      ctx.fillText("MANUAL ENTRY CODE", W / 2, y);
      y += 18;
      ctx.font = "bold 20px 'Courier New', monospace";
      ctx.fillStyle = accentColor;
      ctx.fillText(ticketCode.slice(0, 8).toUpperCase(), W / 2, y);
      y += 20;

      ctx.font = "11px 'Courier New', monospace";
      ctx.fillStyle = themeColors.muted;
      ctx.fillText(`Order: ${orderId.slice(0, 8).toUpperCase()}`, W / 2, y);
      y += 20;

      if (logoImg) {
        const ratio = Math.min(80 / logoImg.width, 36 / logoImg.height);
        const lW = logoImg.width * ratio;
        const lH = logoImg.height * ratio;
        ctx.globalAlpha = 0.18;
        ctx.drawImage(logoImg, (W - lW) / 2, y, lW, lH);
        ctx.globalAlpha = 1;
      }
      ctx.textAlign = "left";

      const link = document.createElement("a");
      link.download = `ticket_${ticketCode.slice(0, 8).toUpperCase()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloading(false);
    }
  }, [
    signedPayload,
    ticketCode,
    event,
    ticketType,
    price,
    holderName,
    holderEmail,
    isRsvp,
    orderId,
    quantity,
    accentColor,
    minimal,
    themeColors,
  ]);

  const isValid = status === "confirmed";
  const isPending = status === "pending";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-b from-gray-900 via-gray-950 to-gray-950">
      <div className="w-full max-w-xl flex flex-col gap-4">
        <div
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold ${isValid
            ? "bg-green-900/30 border border-green-700/50 text-green-400"
            : isPending
              ? "bg-amber-900/30 border border-amber-700/50 text-amber-300"
              : "bg-red-900/30 border border-red-700/50 text-red-400"
            }`}
        >
          {isValid ? <CheckCircle className="w-4 h-4" /> : <CircleAlert className="w-4 h-4" />}
          {isValid
            ? "Confirmed ticket. Ready to scan at the entrance"
            : isPending
              ? "Payment confirmation is pending. This ticket is not valid for entry yet"
              : "This ticket is not valid for entry"}
        </div>

        <div
          className={`relative border shadow-2xl isolate ${minimal ? "rounded-md" : "rounded-2xl"}`}
          style={{ ...getEventThemeStyle(ticketTheme), borderColor: themeColors.border }}
        >
          <div className={`absolute inset-0 flex items-center justify-center pointer-events-none select-none -z-10 overflow-hidden ${minimal ? "rounded-md" : "rounded-2xl"}`}>
            <NextImage
              src={logo}
              alt="watermark"
              className="w-64 opacity-[0.07] object-contain"
            />
          </div>

          <div className={`relative overflow-hidden z-10 ${minimal ? "h-28 rounded-t-md" : "h-40 rounded-t-2xl"}`}>
            <img
              src={event.image}
              alt={event.title}
              className="w-full h-full object-cover brightness-50"
              crossOrigin="anonymous"
            />
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(to top, ${themeColors.card}, ${themeColors.card}80, transparent)` }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <NextImage
                src={logo}
                alt="logo"
                className="w-28 opacity-25 object-contain"
              />
            </div>
            <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: accentColor }}>
                {isRsvp ? "RSVP Ticket" : "Ticket"}
              </p>
              <h1 className="text-gray-100 font-bold text-xl leading-tight">
                {event.title}
              </h1>
            </div>
          </div>

          {minimal ? (
            <div className="mx-5 border-t border-dashed relative z-10" style={{ borderColor: themeColors.border }} />
          ) : (
            <div className="flex items-center px-5 z-10 relative">
              <div className="w-5 h-5 rounded-full -ml-7 shrink-0" style={{ backgroundColor: themeColors.panel }} />
              <div className="flex-1 border-t-2 border-dashed mx-2" style={{ borderColor: themeColors.border }} />
              <div className="w-5 h-5 rounded-full -mr-7 shrink-0" style={{ backgroundColor: themeColors.panel }} />
            </div>
          )}

          <div className={`flex flex-col relative z-10 ${minimal ? "px-4 py-4 gap-4" : "px-5 py-5 sm:px-7 gap-5"}`}>
            <div
              className={`order-1 flex flex-col items-center gap-3 border px-4 py-5 ${minimal ? "rounded-md" : "rounded-2xl"}`}
              style={{ backgroundColor: themeColors.panel, borderColor: `${accentColor}66` }}
            >
              <div className="text-center">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>
                  Entry pass
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  {isValid ? "Show this code to event staff to scan" : "Your scannable code appears after payment is confirmed"}
                </p>
              </div>
              <div className={`bg-white p-3 shadow-lg shadow-purple-950/30 ${minimal ? "rounded-md" : "rounded-2xl"}`}>
                {isPending ? (
                  <div style={{ width: qrPx, height: qrPx }} className="flex items-center justify-center text-amber-700 text-sm text-center px-5">
                    Waiting for verified payment
                  </div>
                ) : sigError ? (
                  <div style={{ width: qrPx, height: qrPx }} className="flex items-center justify-center text-red-400 text-xs text-center px-2">
                    Failed to load QR. Refresh the page.
                  </div>
                ) : !signedPayload ? (
                  <div style={{ width: qrPx, height: qrPx }} className="flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                  </div>
                ) : (
                  <canvas ref={canvasRef} />
                )}
              </div>
              {isValid && (
                <div className="flex flex-col items-center gap-1">
                  <p className="text-gray-500 text-xs uppercase tracking-widest">
                    Backup entry code
                  </p>
                  <div
                    className={`flex items-center gap-2 border px-4 py-2 ${innerRadius}`}
                    style={{ backgroundColor: themeColors.panelRaised, borderColor: themeColors.border }}
                  >
                    <Hash className="w-3.5 h-3.5 text-purple-400" />
                    <span className="font-mono text-gray-100 font-bold text-lg tracking-widest">
                      {ticketCode.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs">Give this code to staff if scanning is unavailable</p>
                </div>
              )}
            </div>
            <div className="order-2 border-t border-dashed" style={{ borderColor: themeColors.border }} />
            <div className="order-3 grid grid-cols-1 gap-2.5">
              <InfoRow icon={CalendarDays} color="text-purple-400" label="Date" value={event.date} />
              <InfoRow icon={Clock} color="text-blue-400" label="Time" value={event.time} />
              <InfoRow icon={MapPin} color="text-red-400" label="Venue" value={event.location} />
              <InfoRow icon={User} color="text-amber-400" label="Host" value={event.host} />
            </div>
            <div className="order-4 border-t border-dashed" style={{ borderColor: themeColors.border }} />
            <div className="order-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={`border p-3 ${innerRadius}`} style={{ backgroundColor: themeColors.panelRaised, borderColor: themeColors.border }}>
                <p className="text-gray-400 text-xs mb-1 flex items-center gap-1">
                  <Ticket className="w-3 h-3" /> Ticket Type
                </p>
                <p className="text-gray-100 font-bold text-sm">{ticketType}</p>
                <p className={`text-xs font-semibold mt-0.5 ${isRsvp ? "text-purple-400" : "text-green-400"}`}>
                  {isRsvp ? "RSVP" : `${event.listingCurrency} ${price}`}
                </p>
              </div>
              <div className={`border p-3 ${innerRadius}`} style={{ backgroundColor: themeColors.panelRaised, borderColor: themeColors.border }}>
                <p className="text-gray-400 text-xs mb-1 flex items-center gap-1">
                  <User className="w-3 h-3" /> Ticket Holder
                </p>
                <p className="text-gray-100 font-bold text-sm truncate">{holderName}</p>
                <p className="text-gray-400 text-xs mt-0.5 truncate">{holderEmail}</p>
              </div>
            </div>
            {quantity > 1 && (
              <div className={`order-6 bg-purple-900/20 border border-purple-700/30 px-4 py-3 text-center ${innerRadius}`}>
                <p className="text-purple-300 text-sm font-semibold">
                  × {quantity} tickets in this order
                </p>
              </div>
            )}
            <div className="order-7 text-center pt-1">
              <p className="text-gray-500 text-xs font-mono">
                Order: {orderId.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleDownload}
          disabled={downloading || !signedPayload}
          className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 border text-gray-300 font-semibold py-3 rounded-xl transition text-sm"
          style={{ borderColor: `${accentColor}80` }}
        >
          {downloading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Preparing download…
            </>
          ) : (
            <>
              <Download className="w-4 h-4" /> Download Ticket
            </>
          )}
        </button>

        <Link
          href={`/events/${event.id}`}
          className="text-center text-gray-600 hover:text-gray-400 text-sm transition"
        >
          ← Back to event
        </Link>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  color,
  label,
  value,
}: {
  icon: React.ElementType;
  color: string;
  label: string;
  value: string;
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