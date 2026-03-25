"use client";
// app/bookings/page.tsx
// Dedicated bookings page — separate from messages.
// Shows all service bookings for the current user (as buyer or vendor).

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ShoppingCart, Loader2, Calendar, CheckCircle,
  XCircle, Clock, Smartphone, AlertTriangle, Info,
  ChevronDown, ChevronUp, RefreshCw, Package,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  createdAt: string;
  listing: { id: string; title: string; price: number | null; priceType: string };
  conversation: {
    id: string;
    buyer: { id: string; name: string | null; email: string };
    vendorProfile?: { id: string; businessName: string; logoImage: string | null; userId: string };
  };
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: "Pending approval", color: "bg-amber-900/30 border-amber-700/40 text-amber-400",    icon: <Clock className="w-3.5 h-3.5" /> },
  approved:  { label: "Approved",         color: "bg-blue-900/30 border-blue-700/40 text-blue-400",       icon: <CheckCircle className="w-3.5 h-3.5" /> },
  paid:      { label: "Paid",             color: "bg-indigo-900/30 border-indigo-700/40 text-indigo-400", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  confirmed: { label: "Confirmed",        color: "bg-green-900/30 border-green-700/40 text-green-400",    icon: <CheckCircle className="w-3.5 h-3.5" /> },
  rejected:  { label: "Declined",         color: "bg-red-900/30 border-red-700/40 text-red-400",          icon: <XCircle className="w-3.5 h-3.5" /> },
  cancelled: { label: "Cancelled",        color: "bg-gray-800 border-gray-700 text-gray-500",             icon: <XCircle className="w-3.5 h-3.5" /> },
};

function relTime(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

// ─── Booking card ─────────────────────────────────────────────────────────────

function BookingCard({
  booking, myId, onAction,
}: {
  booking: Booking; myId: string; onAction: () => void;
}) {
  const router   = useRouter();
  const isVendor = booking.conversation.vendorProfile?.userId === myId;
  const s        = STATUS[booking.status] ?? { label: booking.status, color: "bg-gray-800 border-gray-700 text-gray-500", icon: null };
  const [expanded,   setExpanded]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [phone,      setPhone]      = useState("");
  const [waitingPay, setWaitingPay] = useState(false);
  const [pollSecs,   setPollSecs]   = useState(0);
  const [error,      setError]      = useState("");

  async function doAction(action: string, extra?: object) {
    setError(""); setSubmitting(true);
    try {
      const res  = await fetch("/api/marketplace/bookings", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id, action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Action failed"); return; }
      if (action === "pay" && data.txRef) {
        setWaitingPay(true);
        let elapsed = 0;
        const poll = setInterval(async () => {
          elapsed += 3; setPollSecs(elapsed);
          if (elapsed >= 180) { clearInterval(poll); setWaitingPay(false); setError("Payment timed out."); return; }
          try {
            const r = await fetch(`/api/payment/status?txRef=${data.txRef}`);
            const d = await r.json();
            if (d.status === "successful") { clearInterval(poll); setWaitingPay(false); onAction(); }
            else if (d.status === "failed") { clearInterval(poll); setWaitingPay(false); setError("Payment failed."); }
          } catch { /* keep polling */ }
        }, 3000);
        return;
      }
      onAction();
    } finally { setSubmitting(false); }
  }

  const other = isVendor
    ? (booking.conversation.buyer.name ?? booking.conversation.buyer.email)
    : (booking.conversation.vendorProfile?.businessName ?? "Vendor");

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-semibold ${s.color}`}>
                {s.icon} {s.label}
              </span>
              <span className="text-gray-600 text-xs">{relTime(booking.createdAt)}</span>
            </div>
            <p className="text-gray-100 font-bold text-base leading-snug">{booking.listing.title}</p>
            <p className="text-gray-500 text-sm mt-0.5">
              {isVendor ? `Requested by ${other}` : `From ${other}`}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-green-400 font-black text-lg">KES {booking.totalAmount.toLocaleString()}</p>
            {booking.eventDate && (
              <p className="text-gray-500 text-xs flex items-center gap-1 justify-end mt-0.5">
                <Calendar className="w-3 h-3" />
                {new Date(booking.eventDate).toLocaleDateString("en-KE", { day:"numeric", month:"short", year:"numeric" })}
              </p>
            )}
          </div>
        </div>

        {/* Details toggle */}
        <button onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-400 text-xs mt-3 transition">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? "Hide details" : "Show details"}
        </button>

        {expanded && (
          <div className="mt-3 bg-gray-800/50 rounded-xl p-3 space-y-1.5 text-xs text-gray-500">
            <p>Qty: <span className="text-gray-300">{booking.quantity}</span></p>
            {booking.notes && <p>Notes: <span className="text-gray-300">{booking.notes}</span></p>}
            <p>Payment: <span className="text-gray-300">{booking.paymentMethod === "mpesa" ? "M-Pesa" : "Offline"}</span></p>
            {booking.vendorNote && <p className="text-amber-400">Vendor note: {booking.vendorNote}</p>}
          </div>
        )}
      </div>

      {/* Actions */}
      {error && (
        <div className="mx-4 mb-3 flex items-center gap-2 bg-red-900/20 border border-red-700/30 rounded-xl px-3 py-2 text-red-400 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
        </div>
      )}

      {waitingPay && (
        <div className="mx-4 mb-3 flex flex-col items-center gap-2 p-3 bg-gray-800 rounded-xl text-center">
          <Smartphone className="w-6 h-6 text-purple-400 animate-pulse" />
          <p className="text-gray-300 text-sm font-semibold">Check your M-Pesa — enter your PIN</p>
          <div className="w-full bg-gray-700 rounded-full h-1">
            <div className="bg-purple-500 h-1 rounded-full" style={{ width: `${Math.min((pollSecs/180)*100,100)}%` }} />
          </div>
        </div>
      )}

      {/* Vendor actions */}
      {isVendor && booking.status === "pending" && (
        <div className="px-4 pb-4 flex gap-2">
          <button onClick={() => doAction("approve")} disabled={submitting}
            className="flex-1 flex items-center justify-center gap-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl text-sm transition">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Approve
          </button>
          <button onClick={() => doAction("reject")} disabled={submitting}
            className="flex-1 flex items-center justify-center gap-1.5 bg-red-900/40 border border-red-700/40 hover:bg-red-800 disabled:opacity-40 text-red-300 font-bold py-2.5 rounded-xl text-sm transition">
            <XCircle className="w-4 h-4" /> Decline
          </button>
        </div>
      )}
      {isVendor && booking.status === "approved" && booking.paymentMethod === "offline" && (
        <div className="px-4 pb-4">
          <button onClick={() => doAction("confirm_offline")} disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl text-sm transition">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Confirm payment received
          </button>
        </div>
      )}

      {/* Buyer actions */}
      {!isVendor && booking.status === "approved" && booking.paymentMethod === "mpesa" && !waitingPay && (
        <div className="px-4 pb-4 flex flex-col gap-2">
          <input type="tel" placeholder="254712345678" value={phone}
            onChange={e => setPhone(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-200 text-sm focus:outline-none focus:border-purple-600" />
          <button onClick={() => doAction("pay", { phone })} disabled={submitting || !phone.trim()}
            className="w-full flex items-center justify-center gap-2 bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl text-sm transition">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
            Pay KES {booking.totalAmount.toLocaleString()} via M-Pesa
          </button>
        </div>
      )}
      {!isVendor && booking.status === "approved" && booking.paymentMethod === "offline" && (
        <div className="mx-4 mb-4 flex items-center gap-2 bg-amber-900/20 border border-amber-700/30 rounded-xl px-3 py-2.5 text-amber-300 text-sm">
          <Info className="w-4 h-4 shrink-0" /> Arrange payment directly with the vendor.
        </div>
      )}
      {!isVendor && ["pending","approved"].includes(booking.status) && (
        <div className="px-4 pb-4">
          <button onClick={() => doAction("cancel")} disabled={submitting}
            className="w-full text-gray-600 hover:text-red-400 text-xs transition py-1">
            Cancel booking
          </button>
        </div>
      )}

      {/* Go to conversation */}
      <div className="px-4 pb-4 border-t border-gray-800 pt-3">
        <button onClick={() => router.push(`/messages?c=${booking.conversation.id}`)}
          className="w-full text-purple-400 hover:text-purple-300 text-xs font-semibold transition text-center">
          View conversation →
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function BookingsPageInner() {
  const { data: session, status: authStatus } = useSession();
  const router  = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [myId,     setMyId]     = useState<string | null>(null);
  const [filter,   setFilter]   = useState<"all"|"pending"|"active"|"done">("all");

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/");
  }, [authStatus, router]);

  useEffect(() => {
    if (!session?.user?.email) return;
    fetch("/api/auth/session").then(r => r.json()).then(s => setMyId((s as any)?.user?.id ?? null));
  }, [session]);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/marketplace/bookings");
      const data = await res.json();
      setBookings(data.bookings ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (authStatus === "authenticated") fetchBookings();
  }, [authStatus, fetchBookings]);

  const FILTERS = [
    { id: "all",     label: "All" },
    { id: "pending", label: "Pending" },
    { id: "active",  label: "Active" },
    { id: "done",    label: "Completed" },
  ] as const;

  const filtered = bookings.filter(b => {
    if (filter === "pending") return ["pending"].includes(b.status);
    if (filter === "active")  return ["approved","paid"].includes(b.status);
    if (filter === "done")    return ["confirmed","rejected","cancelled"].includes(b.status);
    return true;
  });

  const pendingCount = bookings.filter(b => b.status === "pending").length;
  const activeCount  = bookings.filter(b => ["approved","paid"].includes(b.status)).length;

  if (authStatus === "loading") return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-2xl mx-auto px-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-gray-100 font-black text-2xl flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-purple-400" /> Bookings
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {pendingCount > 0 && <span className="text-amber-400 font-semibold">{pendingCount} pending · </span>}
              {activeCount > 0  && <span className="text-blue-400 font-semibold">{activeCount} active · </span>}
              {bookings.length} total
            </p>
          </div>
          <button onClick={fetchBookings} className="p-2 text-gray-600 hover:text-gray-400 transition">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-6">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${
                filter === f.id ? "bg-gray-800 text-gray-100 shadow" : "text-gray-500 hover:text-gray-300"
              }`}>
              {f.label}
              {f.id === "pending" && pendingCount > 0 && (
                <span className="ml-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 rounded-full">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-purple-400 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded-2xl">
            <Package className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-400 font-semibold">No bookings here</p>
            <p className="text-gray-600 text-sm mt-1">
              {filter === "all" ? "Bookings from the marketplace will appear here." : `No ${filter} bookings.`}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map(b => (
              <BookingCard key={b.id} booking={b} myId={myId ?? ""} onAction={fetchBookings} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BookingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-purple-400 animate-spin" /></div>}>
      <BookingsPageInner />
    </Suspense>
  );
}