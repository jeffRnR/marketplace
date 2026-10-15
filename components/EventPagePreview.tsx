"use client";

import { CalendarDays, Clock, MapPin, User } from "lucide-react";
import { PreviewDetail } from "@/components/TicketAppearancePreview";
import {
  formatEventDate,
  getEventThemeStyle,
  getEventTicketThemeColors,
  safeEventTicketTheme,
  type EventPageLayout,
} from "@/lib/eventAppearance";

interface EventPagePreviewProps {
  accentColor: string;
  date: string;
  description: string;
  host: string;
  image: string | null;
  isRsvp: boolean;
  listingCurrency: "KES" | "USDC";
  location: string;
  pageLayout: EventPageLayout;
  price: string;
  theme: string;
  time: string;
  title: string;
}

export default function EventPagePreview({
  accentColor,
  date,
  description,
  host,
  image,
  isRsvp,
  listingCurrency,
  location,
  pageLayout,
  price,
  theme,
  time,
  title,
}: EventPagePreviewProps) {
  const safeTheme = safeEventTicketTheme(theme);
  const colors = getEventTicketThemeColors(safeTheme);
  const immersive = pageLayout === "immersive";

  const cover = image ? (
    <img src={image} alt="" className="h-full w-full object-cover" />
  ) : (
    <div className="h-full w-full" style={{ backgroundColor: colors.panelRaised }} />
  );

  const heading = (
    <>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: accentColor }}>
        {isRsvp ? "RSVP event" : "Ticketed event"}
      </p>
      <p className="text-lg font-bold text-white">{title || "Your event name"}</p>
    </>
  );

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-[var(--muted)]">Live event page preview</p>
      <div
        className="overflow-hidden rounded-2xl border shadow-xl"
        style={{ ...getEventThemeStyle(safeTheme), borderColor: colors.border }}
      >
        {immersive && (
          <div className="relative h-36 overflow-hidden">
            {cover}
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(to top, ${colors.card}, transparent)` }}
            />
            <div className="absolute inset-x-4 bottom-3">{heading}</div>
          </div>
        )}

        <div className={`p-4 ${immersive ? "space-y-3" : "flex gap-4"}`}>
          {!immersive && (
            <div className="h-28 w-28 shrink-0 overflow-hidden rounded-xl">{cover}</div>
          )}
          <div className="min-w-0 flex-1 space-y-3">
            {!immersive && <div>{heading}</div>}
            <div className="grid grid-cols-2 gap-2">
              <PreviewDetail icon={<CalendarDays />} label="Date" value={formatEventDate(date)} color={colors.muted} />
              <PreviewDetail icon={<Clock />} label="Time" value={time || "Event time"} color={colors.muted} />
              <PreviewDetail icon={<MapPin />} label="Venue" value={location || "Event venue"} color={colors.muted} />
              <PreviewDetail icon={<User />} label="Host" value={host || "Event host"} color={colors.muted} />
            </div>
            <p className="line-clamp-3 text-[11px]" style={{ color: colors.muted }}>
              {description || "Your event description appears here."}
            </p>
            <div
              className="inline-block rounded-lg px-4 py-2 text-xs font-bold text-white"
              style={{ backgroundColor: accentColor }}
            >
              {isRsvp ? "RSVP" : `Get tickets from ${listingCurrency} ${price || "0"}`}
            </div>
          </div>
        </div>
      </div>
      <p className="mt-2 text-[10px] text-[var(--muted)]">Sample preview of the public event page.</p>
    </div>
  );
}