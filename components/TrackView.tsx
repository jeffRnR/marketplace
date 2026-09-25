"use client";
// components/TrackView.tsx
// Fires on direct visits to /events/[id] (not via short link).
// Reads document.referrer to detect platform, then logs it.
// Visits via /e/[code] are already tracked server-side — this handles everything else.

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

function detectPlatform(referrer: string): string {
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname.replace("www.", "");
    if (host.includes("whatsapp"))                          return "whatsapp";
    if (host.includes("instagram"))                         return "instagram";
    if (host.includes("t.co") || host.includes("twitter") || host.includes("x.com")) return "twitter";
    if (host.includes("facebook") || host.includes("fb"))  return "facebook";
    if (host.includes("tiktok"))                            return "tiktok";
    if (host.includes("linkedin"))                          return "linkedin";
    if (host.includes("telegram"))                          return "telegram";
    return "other";
  } catch {
    return "other";
  }
}

export default function TrackView({ eventId }: { eventId: string }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    // If ?ref= is explicitly set, use it (e.g. QR codes on printed materials)
    // Otherwise detect from document.referrer
    const explicitRef = searchParams.get("ref");
    const ref = explicitRef ?? detectPlatform(document.referrer);

    fetch(`/api/events/${eventId}/track?ref=${encodeURIComponent(ref)}`, {
      method: "POST",
    }).catch(() => {});
  }, [eventId]);

  return null;
}