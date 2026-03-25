"use client";
// app/messages/page.tsx
// Pure messaging interface — bookings have moved to /bookings

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MessageCircle, Send, Loader2, ChevronLeft, Store,
  Package, CheckCheck, Check, ShoppingCart,
} from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConvSummary {
  id: string;
  lastMessageAt: string;
  listing?: { id: string; title: string } | null;
  vendorProfile?: { id: string; businessName: string; logoImage: string | null; userId: string };
  buyer?: { id: string; name: string | null; email: string };
  messages: { content: string; createdAt: string; senderId: string; readAt: string | null }[];
}

interface Message {
  id: string; content: string; senderId: string;
  sender: { id: string; name: string | null; email: string };
  createdAt: string; readAt: string | null;
}

interface ConvDetail {
  id: string;
  buyer:         { id: string; name: string | null; email: string };
  vendorProfile: { id: string; businessName: string; logoImage: string | null; userId: string };
  listing:       { id: string; title: string } | null;
  bookings:      { id: string; status: string }[];
}

// ─── Inner page ───────────────────────────────────────────────────────────────

function MessagesPageInner() {
  const { data: session, status: authStatus } = useSession();
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [conversations, setConversations] = useState<{ asVendor: ConvSummary[]; asBuyer: ConvSummary[] } | null>(null);
  const [activeId,      setActiveId]      = useState<string | null>(searchParams.get("c"));
  const [messages,      setMessages]      = useState<Message[]>([]);
  const [convDetail,    setConvDetail]    = useState<ConvDetail | null>(null);
  const [loadingConvs,  setLoadingConvs]  = useState(true);
  const [loadingMsgs,   setLoadingMsgs]   = useState(false);
  const [input,         setInput]         = useState("");
  const [sending,       setSending]       = useState(false);
  const [myId,          setMyId]          = useState<string | null>(null);
  const [activeTab,     setActiveTab]     = useState<"buyer"|"vendor">("buyer");
  const bottomRef   = useRef<HTMLDivElement>(null);
  const eventSource = useRef<EventSource | null>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/");
  }, [authStatus, router]);

  useEffect(() => {
    if (!session?.user?.email) return;
    fetch("/api/auth/session").then(r => r.json()).then(s => setMyId((s as any)?.user?.id ?? null));
  }, [session]);

  const loadConversations = useCallback(async () => {
    setLoadingConvs(true);
    try {
      const res  = await fetch("/api/messages");
      const data = await res.json();
      setConversations(data);
    } finally { setLoadingConvs(false); }
  }, []);

  useEffect(() => {
    if (authStatus === "authenticated") loadConversations();
  }, [authStatus, loadConversations]);

  useEffect(() => {
    if (!activeId) return;
    setLoadingMsgs(true);
    fetch(`/api/messages/${activeId}`)
      .then(r => r.json())
      .then(data => {
        setMessages(data.messages ?? []);
        setConvDetail(data.conversation ?? null);
        loadConversations();
      })
      .finally(() => setLoadingMsgs(false));

    eventSource.current?.close();
    const es = new EventSource(`/api/messages/${activeId}/stream`);
    eventSource.current = es;
    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
        if (msg.senderId !== myId) {
          fetch(`/api/messages/${activeId}/read`, { method: "PATCH" }).catch(() => {});
        }
        loadConversations();
      } catch { /* heartbeat */ }
    };
    return () => { es.close(); };
  }, [activeId, myId, loadConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || !activeId || sending) return;
    const content = input.trim();
    setInput(""); setSending(true);
    try {
      await fetch(`/api/messages/${activeId}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
    } finally { setSending(false); }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  const vendorConvs    = conversations?.asVendor ?? [];
  const buyerConvs     = conversations?.asBuyer  ?? [];
  const hasVendor      = vendorConvs.length > 0;
  const displayedConvs = activeTab === "vendor" ? vendorConvs : buyerConvs;
  const isVendorInActive = convDetail ? convDetail.vendorProfile.userId === myId : false;

  function convName(conv: ConvSummary, tab: "buyer"|"vendor") {
    return tab === "vendor"
      ? (conv.buyer?.name ?? conv.buyer?.email ?? "Buyer")
      : (conv.vendorProfile?.businessName ?? "Vendor");
  }
  function convAvatar(conv: ConvSummary, tab: "buyer"|"vendor") {
    return tab === "vendor" ? null : (conv.vendorProfile?.logoImage ?? null);
  }

  const pendingBookings = convDetail?.bookings?.filter(b => b.status === "pending").length ?? 0;

  if (authStatus === "loading") return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen pt-16 flex flex-col">
      <div className="flex-1 flex overflow-hidden mx-auto w-full lg:w-[70%]" style={{ height: "calc(100vh - 64px)" }}>

        {/* ── Sidebar ── */}
        <div className={`w-full md:w-64 lg:w-72 border-r border-gray-600 flex flex-col shrink-0 ${activeId ? "hidden md:flex" : "flex"}`}>
          <div className="p-4 border-b border-gray-600">
            <h1 className="text-gray-100 font-bold text-lg flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-purple-400" /> Messages
            </h1>
            {hasVendor && (
              <div className="flex gap-1 mt-3 bg-gray-900 border border-gray-600 rounded-lg p-0.5">
                {(["buyer","vendor"] as const).map(t => (
                  <button key={t} onClick={() => setActiveTab(t)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition ${
                      activeTab === t ? "bg-gray-700 text-gray-100" : "text-gray-500 hover:text-gray-300"
                    }`}>
                    {t === "buyer" ? "My Inquiries" : "Vendor Inbox"}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingConvs ? (
              <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-purple-400 animate-spin" /></div>
            ) : displayedConvs.length === 0 ? (
              <div className="text-center py-16 px-4">
                <MessageCircle className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm font-semibold">No conversations yet</p>
                <p className="text-gray-600 text-xs mt-1">
                  {activeTab === "buyer" ? "Message a vendor from the marketplace." : "Buyers will message you from your profile."}
                </p>
              </div>
            ) : displayedConvs.map(conv => {
              const lastMsg  = conv.messages[0];
              const unread   = conv.messages.filter(m => m.senderId !== myId && !m.readAt).length;
              const isActive = conv.id === activeId;
              const avatar   = convAvatar(conv, activeTab);
              const name     = convName(conv, activeTab);
              return (
                <button key={conv.id} onClick={() => setActiveId(conv.id)}
                  className={`w-full flex items-start gap-3 px-4 py-3.5 text-left border-b border-gray-800/50 transition ${
                    isActive ? "bg-purple-900/20 border-l-2 border-l-purple-500" : "hover:bg-gray-800/40"
                  }`}>
                  <div className="w-10 h-10 rounded-full bg-gray-700 border border-gray-600 overflow-hidden shrink-0 flex items-center justify-center">
                    {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : <Store className="w-5 h-5 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-sm truncate ${unread > 0 ? "font-bold text-gray-100" : "font-medium text-gray-300"}`}>{name}</p>
                      {lastMsg && (
                        <p className="text-gray-600 text-xs shrink-0">
                          {new Date(lastMsg.createdAt).toLocaleTimeString("en-KE", { hour:"2-digit", minute:"2-digit" })}
                        </p>
                      )}
                    </div>
                    {conv.listing && <p className="text-gray-600 text-xs truncate">{conv.listing.title}</p>}
                    {lastMsg && (
                      <p className={`text-xs truncate mt-0.5 ${unread > 0 ? "text-gray-300 font-semibold" : "text-gray-500"}`}>
                        {lastMsg.senderId === myId ? "You: " : ""}{lastMsg.content}
                      </p>
                    )}
                  </div>
                  {unread > 0 && (
                    <span className="bg-purple-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                      {unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Chat panel ── */}
        {activeId ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-600 shrink-0">
              <button onClick={() => setActiveId(null)} className="md:hidden text-gray-500 hover:text-gray-300 transition">
                <ChevronLeft className="w-5 h-5" />
              </button>
              {convDetail?.vendorProfile?.logoImage && (
                <img src={convDetail.vendorProfile.logoImage} alt="" className="w-8 h-8 rounded-full object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-gray-100 font-semibold text-sm truncate">
                  {isVendorInActive
                    ? (convDetail?.buyer?.name ?? convDetail?.buyer?.email ?? "Buyer")
                    : (convDetail?.vendorProfile?.businessName ?? "Vendor")}
                </p>
                {convDetail?.listing && (
                  <p className="text-gray-500 text-xs truncate flex items-center gap-1">
                    <Package className="w-3 h-3" /> {convDetail.listing.title}
                  </p>
                )}
              </div>
              {/* Bookings nudge — link to /bookings */}
              {pendingBookings > 0 && (
                <Link href="/bookings">
                  <button className="flex items-center gap-1.5 text-xs bg-amber-900/30 border border-amber-700/40 text-amber-400 px-3 py-1.5 rounded-xl font-semibold hover:bg-amber-900/50 transition">
                    <ShoppingCart className="w-3.5 h-3.5" />
                    {pendingBookings} booking{pendingBookings !== 1 ? "s" : ""}
                  </button>
                </Link>
              )}
              {pendingBookings === 0 && convDetail?.bookings && convDetail.bookings.length > 0 && (
                <Link href="/bookings">
                  <button className="text-gray-600 hover:text-purple-400 transition text-xs flex items-center gap-1">
                    <ShoppingCart className="w-3.5 h-3.5" /> Bookings
                  </button>
                </Link>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {loadingMsgs ? (
                <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-purple-400 animate-spin" /></div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 text-gray-600 text-sm">No messages yet. Say hello!</div>
              ) : messages.map((msg, i) => {
                const isMe     = msg.senderId === myId;
                const showDate = i === 0 || new Date(messages[i-1].createdAt).toDateString() !== new Date(msg.createdAt).toDateString();
                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="text-center my-2">
                        <span className="text-gray-600 text-xs bg-gray-800 px-3 py-1 rounded-full">
                          {new Date(msg.createdAt).toLocaleDateString("en-KE", { weekday:"short", month:"short", day:"numeric" })}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
                        {!isMe && <p className="text-gray-500 text-xs ml-1">{msg.sender.name ?? msg.sender.email}</p>}
                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isMe ? "bg-purple-600 text-white rounded-tr-sm" : "bg-gray-800 text-gray-200 rounded-tl-sm"
                        }`}>
                          {msg.content}
                        </div>
                        <div className={`flex items-center gap-1 ${isMe ? "justify-end" : "justify-start"} px-1`}>
                          <p className="text-gray-600 text-[11px]">
                            {new Date(msg.createdAt).toLocaleTimeString("en-KE", { hour:"2-digit", minute:"2-digit" })}
                          </p>
                          {isMe && (msg.readAt
                            ? <CheckCheck className="w-3.5 h-3.5 text-purple-400" />
                            : <Check className="w-3.5 h-3.5 text-gray-600" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-600 p-3 shrink-0">
              <div className="flex items-end gap-2 bg-gray-800 border border-gray-700 rounded-2xl px-4 py-2 focus-within:border-purple-600 transition">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
                  rows={1}
                  className="flex-1 bg-transparent text-gray-200 text-sm resize-none outline-none placeholder-gray-600 max-h-32"
                  style={{ minHeight: "24px" }}
                />
                <button onClick={sendMessage} disabled={!input.trim() || sending}
                  className="text-purple-400 hover:text-purple-300 disabled:text-gray-700 transition shrink-0 mb-0.5">
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-gray-700 text-xs mt-1 ml-1">Enter to send · Shift+Enter for new line</p>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center text-center flex-col gap-4">
            <MessageCircle className="w-16 h-16 text-gray-700" />
            <p className="text-gray-400 font-semibold text-lg">Select a conversation</p>
            <p className="text-gray-600 text-sm">Choose from the list on the left</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-purple-400 animate-spin" /></div>}>
      <MessagesPageInner />
    </Suspense>
  );
}