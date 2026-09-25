"use client";
// components/SharePanel.tsx

import { useState } from "react";
import { Copy, Check, Share2, LinkIcon } from "lucide-react";

interface SharePanelProps {
  shortCode: string;
  compact?: boolean;
}

export function SharePanel({ shortCode, compact = false }: SharePanelProps) {
  const [copied, setCopied] = useState(false);

  const base = typeof window !== "undefined" ? window.location.origin : "";
  const shortLink = shortCode ? `${base}/e/${shortCode}` : "";

  const copy = () => {
    if (!shortLink) return;
    navigator.clipboard.writeText(shortLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const nativeShare = () => {
    if (!shortLink || !navigator.share) return;
    navigator.share({ title: "Check out this event", url: shortLink }).catch(() => {});
  };

  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  // Guard — shortCode not yet assigned (pre-existing event before backfill)
  if (!shortCode) {
    return compact ? null : (
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 flex items-center gap-3 text-xs text-gray-500">
        <LinkIcon className="w-4 h-4 shrink-0 text-gray-600" />
        Share link not available yet — refresh the page or recreate the event.
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={copy}
          title={copied ? "Copied!" : "Copy event link"}
          className={`flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg px-3 py-2.5 border transition duration-300 ${
            copied
              ? "border-green-600/50 text-green-400"
              : "border-gray-400/50 text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied!" : "Copy link"}
        </button>

        {canNativeShare && (
          <button
            onClick={nativeShare}
            title="Share event"
            className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg py-2.5 transition px-3"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 flex flex-col gap-4">
      <div>
        <p className="text-sm font-semibold text-gray-200 mb-1">Your event link</p>
        <p className="text-xs text-gray-500">
          Share this one link everywhere — WhatsApp, Instagram, TikTok, printed flyers.
          We automatically detect where your visitors came from.
        </p>
      </div>

      {/* Link display */}
      <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
        <span className="text-sm text-purple-300 font-mono flex-1 truncate">{shortLink}</span>
        <button
          onClick={copy}
          className="shrink-0 text-gray-400 hover:text-gray-200 transition"
          title="Copy link"
        >
          {copied
            ? <Check className="w-4 h-4 text-green-400" />
            : <Copy  className="w-4 h-4" />}
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={copy}
          className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-sm font-medium rounded-lg py-2 transition"
        >
          {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copied!" : "Copy link"}
        </button>

        {canNativeShare && (
          <button
            onClick={nativeShare}
            className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg py-2 transition"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
        )}
      </div>

      <p className="text-[10px] text-gray-600 text-center">
        Analytics show which platform each visitor came from automatically.
      </p>
    </div>
  );
}