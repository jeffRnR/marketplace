"use client";

import { CalendarDays, Clock, MapPin, QrCode, Ticket, User } from "lucide-react";
import type { ReactNode } from "react";
import {
  formatEventDate,
  getEventThemeStyle,
  getEventTicketThemeColors,
  safeEventTicketTheme,
} from "@/lib/eventAppearance";

interface TicketAppearancePreviewProps {
  accentColor: string;
  date: string;
  host: string;
  image: string | null;
  listingCurrency: "KES" | "USDC";
  location: string;
  price: string;
  ticketName: string;
  ticketStyle: "classic" | "minimal";
  ticketTheme: string;
  time: string;
  title: string;
  isRsvp: boolean;
}

export default function TicketAppearancePreview({
  accentColor,
  date,
  host,
  image,
  listingCurrency,
  location,
  price,
  ticketName,
  ticketStyle,
  ticketTheme,
  time,
  title,
  isRsvp,
}: TicketAppearancePreviewProps) {
  const theme = safeEventTicketTheme(ticketTheme);
  const colors = getEventTicketThemeColors(theme);
  const minimal = ticketStyle === "minimal";
  const innerRadius = minimal ? "rounded-sm" : "rounded-xl";

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-[var(--muted)]">Live ticket preview</p>
      <div
        className={`overflow-hidden border shadow-xl ${minimal ? "rounded-md" : "rounded-2xl"}`}
        style={{ ...getEventThemeStyle(theme), borderColor: colors.border }}
      >
        <div className={`relative overflow-hidden ${minimal ? "h-24" : "h-32"}`}>
          {image ? (
            <img src={image} alt="" className="h-full w-full object-cover brightness-50" />
          ) : (
            <div className="h-full w-full" style={{ backgroundColor: colors.panelRaised }} />
          )}
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(to top, ${colors.card}, ${colors.card}80, transparent)` }}
          />
          <div className="absolute inset-x-4 bottom-3">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: accentColor }}>
              {isRsvp ? "RSVP ticket" : "Ticket"}
            </p>
            <p className="truncate text-lg font-bold text-white">{title || "Your event name"}</p>
          </div>
        </div>

        {minimal ? (
          <div className="mx-4 mt-2 border-t border-dashed" style={{ borderColor: colors.border }} />
        ) : (
          <div className="flex items-center gap-2 px-4 py-2">
            <span className="h-4 w-4 -ml-6 rounded-full" style={{ backgroundColor: colors.panel }} />
            <span className="flex-1 border-t border-dashed" style={{ borderColor: colors.border }} />
            <span className="h-4 w-4 -mr-6 rounded-full" style={{ backgroundColor: colors.panel }} />
          </div>
        )}

        <div className={`space-y-3 ${minimal ? "p-3" : "p-4 pt-2"}`}>
          <div
            className={`flex flex-col items-center gap-2 border p-3 ${innerRadius}`}
            style={{ backgroundColor: colors.panel, borderColor: `${accentColor}66` }}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accentColor }}>
              Entry pass
            </p>
            <div className="rounded-lg bg-white p-2 text-gray-900">
              <QrCode className={minimal ? "h-12 w-12" : "h-16 w-16"} strokeWidth={1.5} />
            </div>
            <p className="text-[10px]" style={{ color: colors.muted }}>Sample QR code</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <PreviewDetail icon={<CalendarDays />} label="Date" value={formatEventDate(date)} color={colors.muted} />
            <PreviewDetail icon={<Clock />} label="Time" value={time || "Event time"} color={colors.muted} />
            <PreviewDetail icon={<MapPin />} label="Venue" value={location || "Event venue"} color={colors.muted} />
            <PreviewDetail icon={<User />} label="Host" value={host || "Event host"} color={colors.muted} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className={`border p-2.5 ${innerRadius}`} style={{ backgroundColor: colors.panelRaised, borderColor: colors.border }}>
              <p className="mb-1 flex items-center gap-1 text-[10px]" style={{ color: colors.muted }}>
                <Ticket className="h-3 w-3" /> Ticket type
              </p>
              <p className="truncate text-xs font-bold text-white">{ticketName || "General Admission"}</p>
              <p className="mt-1 text-[10px] font-semibold" style={{ color: accentColor }}>
                {isRsvp ? "RSVP" : `${listingCurrency} ${price || "0"}`}
              </p>
            </div>
            <div className={`border p-2.5 ${innerRadius}`} style={{ backgroundColor: colors.panelRaised, borderColor: colors.border }}>
              <p className="mb-1 flex items-center gap-1 text-[10px]" style={{ color: colors.muted }}>
                <User className="h-3 w-3" /> Ticket holder
              </p>
              <p className="truncate text-xs font-bold text-white">Attendee name</p>
              <p className="mt-1 truncate text-[10px]" style={{ color: colors.muted }}>attendee@email.com</p>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-2 text-[10px] text-[var(--muted)]">Sample preview. The attendee ticket includes a scannable QR code.</p>
    </div>
  );
}

export function PreviewDetail({
  icon,
  label,
  value,
  color,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-1.5">
      <span className="mt-0.5 shrink-0 [&>svg]:h-3 [&>svg]:w-3" style={{ color }}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-wider" style={{ color }}>{label}</p>
        <p className="truncate text-[10px] text-gray-200">{value}</p>
      </div>
    </div>
  );
}