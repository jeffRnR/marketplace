"use client";
// app/messages/page.tsx

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MessageCircle, Send, Loader2, ChevronLeft, Store,
  Package, Calendar, CheckCheck, Check, Clock,
  ShoppingCart, X, AlertTriangle, Smartphone,
  BadgeCheck, XCircle, CheckCircle, Info,
} from "lucide-react";

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
  id: string;
  content: string;
  senderId: string;
  sender: { id: string; name: string | null; email: string };
  createdAt: string;
  readAt: string | null;
}

interface Booking {
  id: string;
  status: string;
  totalAmount: number;
  currency: string;
  quantity: number;
  eventDate: string | null;
  notes: string | null;
  paymentMethod: string;
  vendorNote: string | null;
  listing: { title: string };
}

interface ConvDetail {
  id: string;
  buyer:         { id: string; name: string | null; email: string };
  vendorProfile: { id: string; businessName: string; logoImage: string | null; userId: string };
  listing:       { id: string; title: string; price: number | null; priceType: string; currency: string; images: string[] } | null;
  bookings:      Booking[];
}

// ─── Booking status badge ─────────────────────────────────────────────────────

const BOOKING_STATUS: Record<string, { label: string; color: string }> = {
  pending:   { label: "Pending",   color: "bg-amber-900/30 border-amber-700/40 text-amber-400" },
  approved:  { label: "Approved",  color: "bg-blue-900/30 border-blue-700/40 text-blue-400" },
  paid:      { label: "Paid",      color: "bg-indigo-900/30 border-indigo-700/40 text-indigo-400" },
  confirmed: { label: "Confirmed", color: "bg-green-900/30 border-green-700/40 text-green-400" },
  rejected:  { label: "Rejected",  color: "bg-red-900/30 border-red-700/40 text-red-400" },
  cancelled: { label: "Cancelled", color: "bg-gray-800 border-gray-700 text-gray-500" },
};

function BookingBadge({ status }: { status: string }) {
  const s = BOOKING_STATUS[status] ?? { label: status, color: "bg-gray-800 border-gray-700 text-gray-500" };
  return <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${s.color}`}>{s.label}</span>;
}

// ─── Booking panel ────────────────────────────────────────────────────────────

function BookingPanel({
  conversation, bookings, myId, onAction, isVendor,
}: {
  conversation: ConvDetail;
  bookings: Booking[];
  myId: string;
  onAction: () => void;
  isVendor: boolean;
}) {
  const listing = conversation.listing;
  const [showForm,   setShowForm]   = useState(false);
  const [eventDate,  setEventDate]  = useState("");
  const [quantity,   setQuantity]   = useState("1");
  const [notes,      setNotes]      = useState("");
  const [payMethod,  setPayMethod]  = useState("mpesa");
  const [phone,      setPhone]      = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");
  const [waitingPay, setWaitingPay] = useState<string | null>(null);
  const [pollSecs,   setPollSecs]   = useState(0);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  async function submitBooking() {
    setError(""); setSubmitting(true);
    try {
      const res  = await fetch("/api/marketplace/bookings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversation.id,
          listingId:      listing?.id,
          eventDate:      eventDate || null,
          quantity:       Number(quantity),
          notes, paymentMethod: payMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      setShowForm(false); onAction();
    } finally { setSubmitting(false); }
  }

  async function doAction(bookingId: string, action: string, extra?: object) {
    setError(""); setSubmitting(true);
    try {
      const res  = await fetch("/api/marketplace/bookings", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      if (action === "pay" && data.txRef) {
        setWaitingPay(data.txRef);
        startPoll(data.txRef, bookingId);
        return;
      }
      onAction();
    } finally { setSubmitting(false); }
  }

  function startPoll(txRef: string, bookingId: string) {
    let elapsed = 0;
    pollRef.current = setInterval(async () => {
      elapsed += 3; setPollSecs(elapsed);
      if (elapsed >= 180) {
        clearInterval(pollRef.current!); setWaitingPay(null); setError("Payment timed out."); return;
      }
      try {
        const res  = await fetch(`/api/payment/status?txRef=${txRef}`);
        const data = await res.json();
        if (data.status === "successful") { clearInterval(pollRef.current!); setWaitingPay(null); onAction(); }
        else if (data.status === "failed") { clearInterval(pollRef.current!); setWaitingPay(null); setError("Payment failed or cancelled."); }
      } catch { /* keep polling */ }
    }, 3000);
  }

  const totalPrice = (listing?.price ?? 0) * Number(quantity || 1);
  const canRequest = !isVendor && listing && (bookings.length === 0 || bookings.every(b => ["rejected","cancelled"].includes(b.status)));

  if (waitingPay) return (
    <div className="flex flex-col items-center gap-4 p-4 text-center">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-purple-900/50" />
        <div className="absolute inset-0 rounded-full border-4 border-t-purple-500 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Smartphone className="w-7 h-7 text-purple-400" />
        </div>
      </div>
      <p className="text-gray-300 text-sm font-semibold">Check your M-Pesa</p>
      <p className="text-gray-500 text-xs">Enter your PIN to confirm payment</p>
      <div className="w-full bg-gray-800 rounded-full h-1">
        <div className="bg-purple-500 h-1 rounded-full transition-all" style={{ width: `${Math.min((pollSecs/180)*100,100)}%` }} />
      </div>
      <button onClick={() => { if (pollRef.current) clearInterval(pollRef.current); setWaitingPay(null); }}
        className="text-gray-600 hover:text-gray-400 text-xs transition">Cancel</button>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest">Bookings</p>
        {canRequest && (
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 font-semibold transition">
            <ShoppingCart className="w-3.5 h-3.5" />
            {showForm ? "Cancel" : "Request booking"}
          </button>
        )}
      </div>

      {showForm && listing && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 flex flex-col gap-3">
          <p className="text-gray-300 text-sm font-semibold">{listing.title}</p>
          {listing.price && (
            <p className="text-green-400 text-xs font-bold">
              KES {listing.price.toLocaleString()} {listing.priceType !== "fixed" ? `/ ${listing.priceType}` : ""}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-500 text-xs mb-1 block">Date needed</label>
              <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-purple-600" />
            </div>
            <div>
              <label className="text-gray-500 text-xs mb-1 block">Quantity</label>
              <input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-purple-600" />
            </div>
          </div>
          <div>
            <label className="text-gray-500 text-xs mb-1 block">Notes</label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any special requirements…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-purple-600 resize-none" />
          </div>
          <div>
            <label className="text-gray-500 text-xs mb-1 block">Payment</label>
            <div className="flex gap-2">
              {["mpesa","offline"].map(m => (
                <button key={m} onClick={() => setPayMethod(m)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition ${
                    payMethod === m ? "bg-purple-600 border-purple-500 text-white" : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                  }`}>
                  {m === "mpesa" ? "M-Pesa" : "Pay offline"}
                </button>
              ))}
            </div>
          </div>
          {listing.price && (
            <div className="flex justify-between text-sm font-bold pt-1 border-t border-gray-700">
              <span className="text-gray-400">Total</span>
              <span className="text-white">KES {totalPrice.toLocaleString()}</span>
            </div>
          )}
          {error && <p className="text-red-400 text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3"/>{error}</p>}
          <button onClick={submitBooking} disabled={submitting || !listing}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl text-sm transition flex items-center justify-center gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <ShoppingCart className="w-4 h-4"/>}
            Send booking request
          </button>
        </div>
      )}

      {bookings.length === 0 && !showForm && (
        <p className="text-gray-600 text-xs text-center py-3">No bookings yet.</p>
      )}

      {bookings.map(booking => (
        <div key={booking.id} className="bg-gray-900 border border-gray-700 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-gray-200 text-sm font-semibold">{booking.listing.title}</p>
            <BookingBadge status={booking.status} />
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            <p>Amount: <span className="text-gray-300 font-semibold">KES {booking.totalAmount.toLocaleString()}</span></p>
            {booking.quantity > 1 && <p>Qty: {booking.quantity}</p>}
            {booking.eventDate && <p>Date: {new Date(booking.eventDate).toLocaleDateString("en-KE", { day:"numeric", month:"short", year:"numeric" })}</p>}
            {booking.notes && <p>Notes: {booking.notes}</p>}
            <p>Payment: {booking.paymentMethod === "mpesa" ? "M-Pesa" : "Offline"}</p>
            {booking.vendorNote && <p className="text-amber-400">Vendor note: {booking.vendorNote}</p>}
          </div>
          {error && <p className="text-red-400 text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3"/>{error}</p>}

          {/* Vendor actions */}
          {isVendor && booking.status === "pending" && (
            <div className="flex gap-2">
              <button onClick={() => doAction(booking.id, "approve")} disabled={submitting}
                className="flex-1 flex items-center justify-center gap-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white font-bold py-2 rounded-lg text-xs transition">
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <CheckCircle className="w-3.5 h-3.5"/>} Approve
              </button>
              <button onClick={() => doAction(booking.id, "reject")} disabled={submitting}
                className="flex-1 flex items-center justify-center gap-1.5 bg-red-900/40 hover:bg-red-800 border border-red-700/40 disabled:opacity-40 text-red-300 font-bold py-2 rounded-lg text-xs transition">
                <XCircle className="w-3.5 h-3.5"/> Decline
              </button>
            </div>
          )}
          {isVendor && booking.status === "approved" && booking.paymentMethod === "offline" && (
            <button onClick={() => doAction(booking.id, "confirm_offline")} disabled={submitting}
              className="w-full flex items-center justify-center gap-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white font-bold py-2 rounded-xl text-xs transition">
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <CheckCircle className="w-3.5 h-3.5"/>}
              Confirm payment received
            </button>
          )}

          {/* Buyer actions */}
          {!isVendor && booking.status === "approved" && booking.paymentMethod === "mpesa" && (
            <div className="flex flex-col gap-2">
              <input type="tel" placeholder="254712345678" value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-purple-600" />
              <button onClick={() => doAction(booking.id, "pay", { phone })} disabled={submitting || !phone.trim()}
                className="w-full flex items-center justify-center gap-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl text-sm transition">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Smartphone className="w-4 h-4"/>}
                Pay KES {booking.totalAmount.toLocaleString()} via M-Pesa
              </button>
            </div>
          )}
          {!isVendor && booking.status === "approved" && booking.paymentMethod === "offline" && (
            <div className="flex items-center gap-2 bg-amber-900/20 border border-amber-700/30 rounded-xl px-3 py-2 text-amber-300 text-xs">
              <Info className="w-3.5 h-3.5 shrink-0"/> Arrange payment directly with the vendor.
            </div>
          )}
          {!isVendor && ["pending","approved"].includes(booking.status) && (
            <button onClick={() => doAction(booking.id, "cancel")} disabled={submitting}
              className="text-gray-600 hover:text-red-400 text-xs transition text-center">
              Cancel booking
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Inner page (uses useSearchParams) ───────────────────────────────────────

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
    fetch("/api/auth/session").then(r => r.json()).then(s => {
      setMyId((s as any)?.user?.id ?? null);
    });
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

  const vendorConvs  = conversations?.asVendor ?? [];
  const buyerConvs   = conversations?.asBuyer  ?? [];
  const hasVendor    = vendorConvs.length > 0;
  const displayedConvs = activeTab === "vendor" ? vendorConvs : buyerConvs;
  const isVendorInActive = convDetail ? convDetail.vendorProfile.userId === myId : false;

  function convName(conv: ConvSummary, tab: "buyer"|"vendor") {
    if (tab === "vendor") return conv.buyer?.name ?? conv.buyer?.email ?? "Buyer";
    return conv.vendorProfile?.businessName ?? "Vendor";
  }
  function convAvatar(conv: ConvSummary, tab: "buyer"|"vendor") {
    if (tab === "vendor") return null;
    return conv.vendorProfile?.logoImage ?? null;
  }

  if (authStatus === "loading") return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-purple-400 animate-spin"/>
    </div>
  );

  return (
    <div className="min-h-screen pt-16 flex flex-col">
      <div className="flex-1 flex overflow-hidden mx-auto w-full lg:w-[70%]" style={{ height: "calc(100vh - 64px)" }}>

        {/* ── Sidebar ── */}
        <div className={`w-full md:w-64 lg:w-72 border-r border-gray-600 flex flex-col shrink-0 ${activeId ? "hidden md:flex" : "flex"}`}>
          <div className="p-4 border-b border-gray-600">
            <h1 className="text-gray-100 font-bold text-lg flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-purple-400"/> Messages
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
              <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-purple-400 animate-spin"/></div>
            ) : displayedConvs.length === 0 ? (
              <div className="text-center py-16 px-4">
                <MessageCircle className="w-10 h-10 text-gray-700 mx-auto mb-3"/>
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
                    {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover"/> : <Store className="w-5 h-5 text-gray-400"/>}
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
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-600 shrink-0">
                <button onClick={() => setActiveId(null)} className="md:hidden text-gray-500 hover:text-gray-300 transition">
                  <ChevronLeft className="w-5 h-5"/>
                </button>
                {convDetail?.vendorProfile?.logoImage && (
                  <img src={convDetail.vendorProfile.logoImage} alt="" className="w-8 h-8 rounded-full object-cover"/>
                )}
                <div className="min-w-0">
                  <p className="text-gray-100 font-semibold text-sm truncate">
                    {isVendorInActive
                      ? (convDetail?.buyer?.name ?? convDetail?.buyer?.email ?? "Buyer")
                      : (convDetail?.vendorProfile?.businessName ?? "Vendor")}
                  </p>
                  {convDetail?.listing && (
                    <p className="text-gray-500 text-xs truncate flex items-center gap-1">
                      <Package className="w-3 h-3"/> {convDetail.listing.title}
                    </p>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {loadingMsgs ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-purple-400 animate-spin"/></div>
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
                        <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
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
                              ? <CheckCheck className="w-3.5 h-3.5 text-purple-400"/>
                              : <Check className="w-3.5 h-3.5 text-gray-600"/>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef}/>
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
                    {sending ? <Loader2 className="w-5 h-5 animate-spin"/> : <Send className="w-5 h-5"/>}
                  </button>
                </div>
                <p className="text-gray-700 text-xs mt-1 ml-1">Enter to send · Shift+Enter for new line</p>
              </div>
            </div>

            {/* Right panel: bookings */}
            {convDetail && (
              <div className="hidden lg:flex w-56 border-l border-gray-600 flex-col overflow-y-auto">
                <div className="p-4 border-b border-gray-600 shrink-0">
                  <p className="text-gray-300 text-sm font-bold">Booking & Services</p>
                </div>
                <div className="p-4 flex-1">
                  <BookingPanel
                    conversation={convDetail}
                    bookings={convDetail.bookings}
                    myId={myId ?? ""}
                    isVendor={isVendorInActive}
                    onAction={() => {
                      fetch(`/api/messages/${activeId}`)
                        .then(r => r.json())
                        .then(d => { setMessages(d.messages ?? []); setConvDetail(d.conversation ?? null); });
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center text-center flex-col gap-4">
            <MessageCircle className="w-16 h-16 text-gray-700"/>
            <p className="text-gray-400 font-semibold text-lg">Select a conversation</p>
            <p className="text-gray-600 text-sm">Choose from the list on the left</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Default export wrapped in Suspense ───────────────────────────────────────

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    }>
      <MessagesPageInner />
    </Suspense>
  );
}