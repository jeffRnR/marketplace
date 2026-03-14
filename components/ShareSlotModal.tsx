"use client";
// app/components/ShareSlotModal.tsx
// Reusable share modal for vending slot links.
//
// Usage:
//   <ShareSlotButton url="https://..." title="Vending slots — Jazz Night" />
//
// Behaviour:
//   1. On click → try navigator.share() (native sheet on Android/iOS/Chrome)
//   2. If not supported → open a styled modal with:
//      - Copy link (with animated feedback)
//      - WhatsApp
//      - Twitter / X
//      - Email
//      - Close

import { useState, useEffect, useRef } from "react";
import {
  Share2, Copy, Check, X, Mail,
  MessageCircle, Twitter,
} from "lucide-react";

interface Props {
  url:       string;   // full URL to share
  title?:    string;   // e.g. "Vending slots — Jazz Night at KICC"
  text?:     string;   // body text for share sheet / email
  label?:    string;   // button label — defaults to "Share"
  className?: string;  // extra classes for the trigger button
}

export default function ShareSlotButton({
  url,
  title = "Vending slots available",
  text  = "Apply for a vending slot at this event:",
  label = "Share",
  className = "",
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [copied,    setCopied]    = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!showModal) return;
    function handleClick(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setShowModal(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showModal]);

  // Close on Escape
  useEffect(() => {
    if (!showModal) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowModal(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [showModal]);

  // Lock body scroll when modal open
  useEffect(() => {
    document.body.style.overflow = showModal ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [showModal]);

  async function handleShare() {
    // Try native share first (mobile browsers, Chrome on Android/desktop)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return; // native sheet handled everything
      } catch (err: any) {
        if (err?.name === "AbortError") return; // user dismissed — don't open modal
        // Other error → fall through to modal
      }
    }
    // Fallback: open our custom modal
    setShowModal(true);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const encodedUrl  = encodeURIComponent(url);
  const encodedText = encodeURIComponent(`${text} ${url}`);

  const shareOptions = [
    {
      label:   "WhatsApp",
      icon:    <MessageCircle className="w-5 h-5" />,
      color:   "bg-green-700 hover:bg-green-600 text-white",
      href:    `https://wa.me/?text=${encodedText}`,
    },
    {
      label:   "Twitter / X",
      icon:    <Twitter className="w-5 h-5" />,
      color:   "bg-gray-900 hover:bg-gray-800 border border-gray-600 text-gray-200",
      href:    `https://twitter.com/intent/tweet?text=${encodedText}`,
    },
    {
      label:   "Email",
      icon:    <Mail className="w-5 h-5" />,
      color:   "bg-blue-900/60 hover:bg-blue-800 border border-blue-700/50 text-blue-200",
      href:    `mailto:?subject=${encodeURIComponent(title)}&body=${encodedText}`,
    },
  ];

  return (
    <>
      {/* ── Trigger button ── */}
      <button
        onClick={handleShare}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition
          bg-gray-800 border-gray-700 text-gray-300 hover:border-purple-500 hover:text-purple-300
          ${className}`}
      >
        <Share2 className="w-3.5 h-3.5" />
        {label}
      </button>

      {/* ── Modal backdrop ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Sheet */}
          <div
            ref={modalRef}
            className="relative w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl
                       shadow-2xl shadow-black/60 overflow-hidden
                       animate-in slide-in-from-bottom-4 duration-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <div>
                <p className="text-gray-100 font-bold text-sm">Share vendor page</p>
                <p className="text-gray-500 text-xs mt-0.5 truncate max-w-[240px]">{title}</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-600 hover:text-gray-300 transition p-1 rounded-lg hover:bg-gray-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* URL preview */}
            <div className="px-5 py-3 bg-gray-950/60 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <p className="text-gray-500 text-xs font-mono truncate flex-1">{url}</p>
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
                    copied
                      ? "bg-green-900/40 border border-green-700/40 text-green-400"
                      : "bg-gray-800 border border-gray-700 text-gray-300 hover:border-purple-500 hover:text-purple-300"
                  }`}
                >
                  {copied
                    ? <><Check className="w-3 h-3" /> Copied!</>
                    : <><Copy className="w-3 h-3" /> Copy</>}
                </button>
              </div>
            </div>

            {/* Share options */}
            <div className="p-5 flex flex-col gap-2.5">
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-1">
                Share via
              </p>
              {shareOptions.map((opt) => (
                <a
                  key={opt.label}
                  href={opt.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowModal(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${opt.color}`}
                >
                  {opt.icon}
                  {opt.label}
                </a>
              ))}
            </div>

            {/* Bottom safe area */}
            <div className="h-2" />
          </div>
        </div>
      )}
    </>
  );
}