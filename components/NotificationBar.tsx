"use client";
// app/components/NotificationBar.tsx

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Bell, Ticket, Store, MessageCircle, ShoppingCart,
  CheckCircle, XCircle, BadgeCheck, X, Check,
  ChevronRight, Package,
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

interface ConvSummary {
  id: string;
  lastMessageAt: string;
  listing?: { id: string; title: string } | null;
  vendorProfile?: { id: string; businessName: string; logoImage: string | null; userId: string };
  buyer?: { id: string; name: string | null; email: string };
  messages: { content: string; createdAt: string; senderId: string; readAt: string | null }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

function NotifIcon({ type }: { type: string }) {
  const cls = "w-4 h-4 shrink-0";
  switch (type) {
    case "ticket_order":        return <Ticket        className={`${cls} text-purple-400`} />;
    case "rsvp":                return <Ticket        className={`${cls} text-blue-400`} />;
    case "vending_application": return <Store         className={`${cls} text-amber-400`} />;
    case "vending_confirmed":   return <Store         className={`${cls} text-green-400`} />;
    case "booking_request":     return <ShoppingCart  className={`${cls} text-orange-400`} />;
    case "booking_approved":    return <CheckCircle   className={`${cls} text-green-400`} />;
    case "booking_rejected":    return <XCircle       className={`${cls} text-red-400`} />;
    case "booking_confirmed":   return <BadgeCheck    className={`${cls} text-green-400`} />;
    case "new_message":         return <MessageCircle className={`${cls} text-purple-400`} />;
    default:                    return <Bell          className={`${cls} text-[var(--muted)]`} />;
  }
}

// ─── Notification row ─────────────────────────────────────────────────────────

function NotifRow({ notif, onClick }: { notif: Notification; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-gray-400/10 transition hover:bg-white/3 ${
        !notif.isRead ? "bg-purple-600/5" : ""
      }`}
    >
      <div className="mt-0.5 shrink-0 relative">
        <NotifIcon type={notif.type} />
        {!notif.isRead && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-purple-600 rounded-full" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${notif.isRead ? "text-[var(--muted)]" : "text-[var(--foreground)] font-semibold"}`}>
          {notif.title}
        </p>
        <p className="text-[var(--muted)] text-xs mt-0.5 leading-relaxed line-clamp-2">{notif.body}</p>
        <p className="text-[var(--muted)] text-xs mt-1 opacity-60">{relativeTime(notif.createdAt)}</p>
      </div>
    </button>
  );
}

// ─── Chat row ─────────────────────────────────────────────────────────────────

function ChatRow({
  conv, myId, isVendorTab, onClick,
}: {
  conv: ConvSummary; myId: string | null; isVendorTab: boolean; onClick: () => void;
}) {
  const lastMsg = conv.messages[0];
  const unread  = conv.messages.filter(m => m.senderId !== myId && !m.readAt).length;
  const name    = isVendorTab
    ? (conv.buyer?.name ?? conv.buyer?.email ?? "Buyer")
    : (conv.vendorProfile?.businessName ?? "Vendor");
  const avatar  = isVendorTab ? null : conv.vendorProfile?.logoImage ?? null;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 px-4 py-3 text-left border-b border-gray-400/10 transition hover:bg-white/3 group"
    >
      <div className="w-9 h-9 rounded-full bg-white/5 border border-gray-400/20 overflow-hidden shrink-0 flex items-center justify-center mt-0.5">
        {avatar
          ? <img src={avatar} alt="" className="w-full h-full object-cover" />
          : <Store className="w-4 h-4 text-[var(--muted)]" />
        }
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <p className={`text-sm truncate ${unread > 0 ? "font-bold text-[var(--foreground)]" : "font-medium text-[var(--muted)]"}`}>
            {name}
          </p>
          {lastMsg && (
            <p className="text-[var(--muted)] text-[11px] shrink-0 opacity-60">
              {relativeTime(lastMsg.createdAt)}
            </p>
          )}
        </div>
        {conv.listing && (
          <p className="text-[var(--muted)] text-xs truncate flex items-center gap-1 mb-0.5">
            <Package className="w-3 h-3 shrink-0" />{conv.listing.title}
          </p>
        )}
        {lastMsg && (
          <p className={`text-xs truncate ${unread > 0 ? "text-[var(--foreground)] font-semibold" : "text-[var(--muted)]"}`}>
            {lastMsg.senderId === myId ? "You: " : ""}{lastMsg.content}
          </p>
        )}
      </div>

      <div className="shrink-0 flex items-center self-center">
        {unread > 0 ? (
          <span className="bg-purple-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unread}
          </span>
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-[var(--muted)] opacity-40 group-hover:opacity-70 transition" />
        )}
      </div>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NotificationBar() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [open,      setOpen]      = useState(false);
  const [activeTab, setActiveTab] = useState<"notifications" | "chats">("notifications");

  const [notifs,      setNotifs]      = useState<Notification[]>([]);
  const [unreadNotif, setUnreadNotif] = useState(0);
  const [marking,     setMarking]     = useState(false);

  const [conversations, setConversations] = useState<{ asVendor: ConvSummary[]; asBuyer: ConvSummary[] } | null>(null);
  const [unreadChats,   setUnreadChats]   = useState(0);
  const [myId,          setMyId]          = useState<string | null>(null);
  const [chatTab,       setChatTab]       = useState<"buyer" | "vendor">("buyer");

  const dropdownRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/auth/session")
      .then(r => r.json())
      .then((s: { user?: { id?: string } }) => setMyId(s.user?.id ?? null));
  }, [session]);

  const fetchNotifs = useCallback(async () => {
    if (status !== "authenticated") return;
    try {
      const res  = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifs(data.notifications ?? []);
      setUnreadNotif(data.unreadCount ?? 0);
    } catch { /* silent */ }
  }, [status]);

  const fetchConvs = useCallback(async () => {
    if (status !== "authenticated") return;
    try {
      const res  = await fetch("/api/messages");
      if (!res.ok) return;
      const data = await res.json();
      setConversations(data);
      const allConvs = [...(data.asVendor ?? []), ...(data.asBuyer ?? [])];
      const total = allConvs.reduce((acc: number, conv: ConvSummary) =>
        acc + conv.messages.filter(m => m.senderId !== myId && !m.readAt).length, 0);
      setUnreadChats(total);
      if ((data.asVendor ?? []).length > 0 && (data.asBuyer ?? []).length === 0) setChatTab("vendor");
    } catch { /* silent */ }
  }, [status, myId]);

  useEffect(() => {
    fetchNotifs();
    fetchConvs();
    intervalRef.current = setInterval(() => { fetchNotifs(); fetchConvs(); }, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchNotifs, fetchConvs]);

  useEffect(() => { if (myId) fetchConvs(); }, [myId, fetchConvs]);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handle(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open]);

  async function handleNotifClick(notif: Notification) {
    setOpen(false);
    if (!notif.isRead) {
      setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
      setUnreadNotif(prev => Math.max(0, prev - 1));
      fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notif.id }),
      }).catch(() => {});
    }
    if (notif.linkUrl) router.push(notif.linkUrl);
  }

  function handleChatClick(convId: string) {
    setOpen(false);
    router.push(`/messages?c=${convId}`);
  }

  async function markAllRead() {
    if (unreadNotif === 0 || marking) return;
    setMarking(true);
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadNotif(0);
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
    } finally { setMarking(false); }
  }

  if (status !== "authenticated") return null;

  const totalUnread    = unreadNotif + unreadChats;
  const unreadNotifs   = notifs.filter(n => !n.isRead);
  const readNotifs     = notifs.filter(n => n.isRead);
  const vendorConvs    = conversations?.asVendor ?? [];
  const buyerConvs     = conversations?.asBuyer  ?? [];
  const hasVendorConvs = vendorConvs.length > 0;
  const displayedConvs = chatTab === "vendor" ? vendorConvs : buyerConvs;
  const totalConvs     = vendorConvs.length + buyerConvs.length;

  const tabClass = (active: boolean) =>
    `flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition border-b-2 ${
      active
        ? "border-purple-600 text-[var(--foreground)]"
        : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
    }`;

  return (
    <div className="relative" ref={dropdownRef}>

      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--brand-purple)] hover:bg-white/5 transition duration-300"
        aria-label={`Notifications${totalUnread > 0 ? ` — ${totalUnread} unread` : ""}`}
      >
        <Bell className="w-5 h-5" />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-0.5 leading-none">
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="
          fixed top-16 left-1/2 -translate-x-1/2
          w-[92vw] max-w-sm
          sm:absolute sm:left-auto sm:translate-x-0 sm:right-0 sm:top-10 sm:w-96
          bg-gray-900 border border-gray-400/20
          rounded-2xl shadow-2xl z-50 overflow-hidden
          animate-slideDown
        ">

          {/* Tab bar */}
          <div className="flex items-center border-b border-[var(--brand-purple)]/25">
            <button onClick={() => setActiveTab("notifications")} className={tabClass(activeTab === "notifications")}>
              <Bell className="w-4 h-4" />
              Notifications
              {unreadNotif > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {unreadNotif}
                </span>
              )}
            </button>

            <button onClick={() => setActiveTab("chats")} className={tabClass(activeTab === "chats")}>
              <MessageCircle className="w-4 h-4" />
              Chats
              {unreadChats > 0 && (
                <span className="bg-purple-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {unreadChats}
                </span>
              )}
            </button>

            <button
              onClick={() => setOpen(false)}
              className="text-[var(--muted)] hover:text-[var(--foreground)] transition px-3 py-3"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Notifications tab */}
          {activeTab === "notifications" && (
            <>
              {unreadNotif > 0 && (
                <div className="flex items-center justify-end px-4 py-2 border-b border-[var(--brand-purple)]/25">
                  <button
                    onClick={markAllRead}
                    disabled={marking}
                    className="flex items-center gap-1 text-xs text-purple-600 hover:opacity-80 transition font-semibold disabled:opacity-40"
                  >
                    <Check className="w-3 h-3" /> Mark all read
                  </button>
                </div>
              )}

              <div className="max-h-[380px] overflow-y-auto">
                {notifs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 gap-3 text-[var(--muted)]">
                    <Bell className="w-8 h-8 opacity-30" />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : (
                  <>
                    {unreadNotifs.length > 0 && (
                      <div>
                        <p className="px-4 py-2 text-xs text-[var(--muted)] font-semibold uppercase tracking-widest bg-white/2">
                          New
                        </p>
                        {unreadNotifs.map(n => (
                          <NotifRow key={n.id} notif={n} onClick={() => handleNotifClick(n)} />
                        ))}
                      </div>
                    )}
                    {readNotifs.length > 0 && (
                      <div>
                        {unreadNotifs.length > 0 && (
                          <p className="px-4 py-2 text-xs text-[var(--muted)] font-semibold uppercase tracking-widest bg-white/2">
                            Earlier
                          </p>
                        )}
                        {readNotifs.map(n => (
                          <NotifRow key={n.id} notif={n} onClick={() => handleNotifClick(n)} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {notifs.length > 0 && (
                <div className="border-t border-[var(--brand-purple)]/25 px-4 py-2.5 text-center">
                  <p className="text-[var(--muted)] text-xs">Showing last {notifs.length} notifications</p>
                </div>
              )}
            </>
          )}

          {/* Chats tab */}
          {activeTab === "chats" && (
            <>
              {hasVendorConvs && buyerConvs.length > 0 && (
                <div className="flex gap-1 p-2 border-b border-[var(--brand-purple)]/25">
                  {(["buyer", "vendor"] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setChatTab(t)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                        chatTab === t
                          ? "bg-white/5 text-[var(--foreground)] border border-[var(--brand-purple)]/25"
                          : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-white/3"
                      }`}
                    >
                      {t === "buyer" ? "My Inquiries" : "Vendor Inbox"}
                    </button>
                  ))}
                </div>
              )}

              <div className="max-h-[380px] overflow-y-auto">
                {totalConvs === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 gap-3 text-[var(--muted)]">
                    <MessageCircle className="w-8 h-8 opacity-30" />
                    <p className="text-sm">No conversations yet</p>
                    <p className="text-xs opacity-60 text-center px-6">
                      Message a vendor from the marketplace to start a conversation
                    </p>
                  </div>
                ) : displayedConvs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-[var(--muted)]">
                    <p className="text-sm">No {chatTab === "buyer" ? "inquiries" : "vendor messages"} yet</p>
                  </div>
                ) : (
                  displayedConvs.map(conv => (
                    <ChatRow
                      key={conv.id}
                      conv={conv}
                      myId={myId}
                      isVendorTab={chatTab === "vendor"}
                      onClick={() => handleChatClick(conv.id)}
                    />
                  ))
                )}
              </div>

              <div className="border-t border-[var(--brand-purple)]/25 px-4 py-2.5">
                <button
                  onClick={() => { setOpen(false); router.push("/messages"); }}
                  className="w-full flex items-center justify-center gap-2 text-xs text-purple-600 hover:opacity-80 font-semibold transition py-1"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Open full messages
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}