"use client";
// app/components/NotificationBar.tsx
// Universal notification bell — covers all notification types:
//   ticket_order, rsvp, vending_application, vending_confirmed,
//   booking_request, booking_approved, booking_rejected,
//   booking_confirmed, new_message
//
// Polls every 30s. Opens a dropdown with unread-first list.
// Clicking a notification marks it read and navigates to linkUrl.
// "Mark all read" clears the badge instantly.

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Bell,
  Ticket,
  Store,
  MessageCircle,
  ShoppingCart,
  CheckCircle,
  XCircle,
  BadgeCheck,
  X,
  Check,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

// ─── Icon per notification type ───────────────────────────────────────────────

function NotifIcon({ type }: { type: string }) {
  const cls = "w-4 h-4 shrink-0";
  switch (type) {
    case "ticket_order":
      return <Ticket className={`${cls} text-purple-400`} />;
    case "rsvp":
      return <Ticket className={`${cls} text-blue-400`} />;
    case "vending_application":
      return <Store className={`${cls} text-amber-400`} />;
    case "vending_confirmed":
      return <Store className={`${cls} text-green-400`} />;
    case "booking_request":
      return <ShoppingCart className={`${cls} text-orange-400`} />;
    case "booking_approved":
      return <CheckCircle className={`${cls} text-green-400`} />;
    case "booking_rejected":
      return <XCircle className={`${cls} text-red-400`} />;
    case "booking_confirmed":
      return <BadgeCheck className={`${cls} text-green-400`} />;
    case "new_message":
      return <MessageCircle className={`${cls} text-purple-400`} />;
    default:
      return <Bell className={`${cls} text-gray-400`} />;
  }
}

// ─── Relative time helper ─────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
  });
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NotificationBar() {
  const { status } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [marking, setMarking] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // ── Fetch notifications ───────────────────────────────────────────────────

  const fetchNotifs = useCallback(async () => {
    if (status !== "authenticated") return;
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifs(data.notifications ?? []);
      setUnread(data.unreadCount ?? 0);
    } catch {
      /* silent */
    }
  }, [status]);

  useEffect(() => {
    fetchNotifs();
    intervalRef.current = setInterval(fetchNotifs, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchNotifs]);

  // ── Close on outside click ────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  // ── Close on Escape ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    function handle(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open]);

  // ── Click a notification ──────────────────────────────────────────────────

  async function handleClick(notif: Notification) {
    setOpen(false);

    // Mark as read optimistically
    if (!notif.isRead) {
      setNotifs((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)),
      );
      setUnread((prev) => Math.max(0, prev - 1));
      fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notif.id }),
      }).catch(() => {});
    }

    if (notif.linkUrl) router.push(notif.linkUrl);
  }

  // ── Mark all read ─────────────────────────────────────────────────────────

  async function markAllRead() {
    if (unread === 0 || marking) return;
    setMarking(true);
    // Optimistic update
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
    } finally {
      setMarking(false);
    }
  }

  if (status !== "authenticated") return null;

  const unreadNotifs = notifs.filter((n) => !n.isRead);
  const readNotifs = notifs.filter((n) => n.isRead);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ── Bell button ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center text-gray-300 hover:text-gray-100 transition"
        title="Notifications"
        aria-label={`Notifications${unread > 0 ? ` — ${unread} unread` : ""}`}
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center
                           bg-red-500 text-white text-[10px] font-bold rounded-full px-0.5 leading-none"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div className="
          fixed top-16 left-1/2 -translate-x-1/2
          w-[90vw] max-w-sm

          sm:absolute sm:left-auto sm:translate-x-0 sm:right-0 sm:top-10 sm:w-96

          bg-gray-900 border border-gray-700
          rounded-2xl shadow-2xl shadow-black/60 z-50 overflow-hidden
          animate-in slide-in-from-top-2 duration-150
        ">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <h3 className="text-gray-100 font-bold text-sm">Notifications</h3>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  disabled={marking}
                  className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition font-semibold disabled:opacity-40"
                >
                  <Check className="w-3 h-3" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-gray-600 hover:text-gray-400 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-600">
                <Bell className="w-8 h-8 opacity-40" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <>
                {/* Unread */}
                {unreadNotifs.length > 0 && (
                  <div>
                    <p className="px-4 py-2 text-xs text-gray-500 font-semibold uppercase tracking-widest bg-gray-950/50">
                      New
                    </p>
                    {unreadNotifs.map((notif) => (
                      <NotifRow
                        key={notif.id}
                        notif={notif}
                        onClick={() => handleClick(notif)}
                      />
                    ))}
                  </div>
                )}

                {/* Read */}
                {readNotifs.length > 0 && (
                  <div>
                    {unreadNotifs.length > 0 && (
                      <p className="px-4 py-2 text-xs text-gray-600 font-semibold uppercase tracking-widest bg-gray-950/50">
                        Earlier
                      </p>
                    )}
                    {readNotifs.map((notif) => (
                      <NotifRow
                        key={notif.id}
                        notif={notif}
                        onClick={() => handleClick(notif)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {notifs.length > 0 && (
            <div className="border-t border-gray-800 px-4 py-2.5 text-center">
              <p className="text-gray-600 text-xs">
                Showing last {notifs.length} notifications
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Notification row ─────────────────────────────────────────────────────────

function NotifRow({
  notif,
  onClick,
}: {
  notif: Notification;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-gray-800/50
                  transition hover:bg-gray-800/50 ${!notif.isRead ? "bg-purple-950/20" : ""}`}
    >
      {/* Unread dot */}
      <div className="mt-1 shrink-0 relative">
        <NotifIcon type={notif.type} />
        {!notif.isRead && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-purple-500 rounded-full" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm leading-snug ${notif.isRead ? "text-gray-400" : "text-gray-100 font-semibold"}`}
        >
          {notif.title}
        </p>
        <p className="text-gray-500 text-xs mt-0.5 leading-relaxed line-clamp-2">
          {notif.body}
        </p>
        <p className="text-gray-600 text-xs mt-1">
          {relativeTime(notif.createdAt)}
        </p>
      </div>
    </button>
  );
}
