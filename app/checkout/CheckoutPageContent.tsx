"use client";
// app/checkout/CheckoutPageContent.tsx
// RSVP/free: confirms immediately (unchanged).
// Paid tickets: initiates Flutterwave STK push, shows waiting screen,
//               polls /api/payment/status?txRef=... until confirmed.

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Loader2, CheckCircle, Tag, X, Ticket,
  User, Mail, Phone, AlertTriangle, Smartphone,
} from "lucide-react";

interface CartItem {
  ticketId:   number;
  ticketType: string;
  price:      string;
  quantity:   number;
}

type CheckoutStatus = "idle" | "loading" | "waiting_mpesa" | "success" | "error";

const INPUT = "w-full bg-gray-800 text-gray-300 rounded-xl border border-gray-700 px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition placeholder-gray-600";

export default function CheckoutPageContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const title       = searchParams.get("title")    ?? "";
  const image       = searchParams.get("image")    ?? "";
  const date        = searchParams.get("date")     ?? "";
  const location    = searchParams.get("location") ?? "";
  const ticketsJSON = searchParams.get("tickets")  ?? "";
  const eventIdParam = searchParams.get("eventId") ?? "";

  const [cartItems,    setCartItems]    = useState<CartItem[]>([]);
  const [eventId,      setEventId]      = useState(eventIdParam);
  const [name,         setName]         = useState("");
  const [email,        setEmail]        = useState("");
  const [phone,        setPhone]        = useState("");
  const [promoInput,   setPromoInput]   = useState("");
  const [promoApplied, setPromoApplied] = useState<{ code: string; discount: string } | null>(null);
  const [promoError,   setPromoError]   = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [status,       setStatus]       = useState<CheckoutStatus>("idle");
  const [errorMsg,     setErrorMsg]     = useState("");
  const [ticketCodes,  setTicketCodes]  = useState<string[]>([]);
  const [parseError,   setParseError]   = useState("");
  const [txRef,        setTxRef]        = useState<string | null>(null);
  const [pollSeconds,  setPollSeconds]  = useState(0);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    try {
      if (!ticketsJSON) { setParseError("No ticket data. Please go back."); return; }
      const parsed = JSON.parse(decodeURIComponent(ticketsJSON));
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error();
      const normalised: CartItem[] = parsed.map((item: any) => ({
        ticketId:   item.ticketId   ?? item.id   ?? 0,
        ticketType: item.ticketType ?? item.type  ?? "Ticket",
        price:      String(item.price ?? "0"),
        quantity:   item.quantity   ?? 1,
      }));
      setCartItems(normalised);
    } catch {
      setParseError("Could not load ticket data. Please go back and try again.");
    }
  }, [ticketsJSON, eventIdParam]);

  // ── Stop polling on unmount ───────────────────────────────────────────
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // ── Poll payment status ───────────────────────────────────────────────
  function startPolling(ref: string) {
    let elapsed = 0;
    pollRef.current = setInterval(async () => {
      elapsed += 3;
      setPollSeconds(elapsed);

      // Timeout after 3 minutes
      if (elapsed >= 180) {
        clearInterval(pollRef.current!);
        setStatus("error");
        setErrorMsg("Payment timed out. If you completed the M-Pesa prompt, please contact support with your reference.");
        return;
      }

      try {
        const res  = await fetch(`/api/payment/status?txRef=${ref}`);
        const data = await res.json();

        if (data.status === "successful") {
          clearInterval(pollRef.current!);
          setTicketCodes(data.ticketCodes ?? []);
          setStatus("success");
        } else if (data.status === "failed") {
          clearInterval(pollRef.current!);
          setStatus("error");
          setErrorMsg("Payment failed or was cancelled. Please try again.");
        }
        // "pending" → keep polling
      } catch {
        // Network blip — keep polling
      }
    }, 3000);
  }

  // ── Promo ─────────────────────────────────────────────────────────────
  const handleApplyPromo = async () => {
    if (!promoInput.trim() || !eventId) return;
    setPromoLoading(true); setPromoError("");
    try {
      const res  = await fetch(`/api/promos/validate?eventId=${eventId}&code=${promoInput.trim().toUpperCase()}`);
      const data = await res.json();
      if (!res.ok) { setPromoError(data.error ?? "Invalid code."); return; }
      setPromoApplied({ code: data.code, discount: data.discount });
      setPromoInput("");
    } catch {
      setPromoError("Could not validate promo code.");
    } finally {
      setPromoLoading(false);
    }
  };

  // ── Totals ────────────────────────────────────────────────────────────
  const subtotal = cartItems.reduce((sum, t) => {
    const p = parseFloat(String(t.price).replace(/[^0-9.]/g, "")) || 0;
    return sum + p * t.quantity;
  }, 0);

  function calcDiscount(sub: number, discount: string): number {
    if (discount.trim().endsWith("%")) return sub * (parseFloat(discount) / 100);
    return Math.min(sub, parseFloat(discount.replace(/[^0-9.]/g, "")) || 0);
  }

  const discountAmount = promoApplied ? calcDiscount(subtotal, promoApplied.discount) : 0;
  const total          = Math.max(0, subtotal - discountAmount);
  const isRsvp         = cartItems.length > 0 &&
    cartItems.every((t) => t.price === "Free" || t.price === "0" || t.ticketType === "RSVP");

  // ── Submit ────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setErrorMsg("");
    if (!name.trim())  { setErrorMsg("Please enter your name.");          return; }
    if (!email.trim()) { setErrorMsg("Please enter your email address."); return; }
    if (!phone.trim()) { setErrorMsg("Please enter your phone number.");  return; }
    if (!/^\+?\d{9,15}$/.test(phone.replace(/\s/g, "")))
      { setErrorMsg("Please enter a valid phone number (e.g. +254712345678)."); return; }
    if (!eventId)       { setErrorMsg("Event ID is missing. Please go back."); return; }
    if (cartItems.length === 0) { setErrorMsg("No tickets selected."); return; }

    setStatus("loading");

    try {
      const res  = await fetch("/api/checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ eventId, name: name.trim(), email: email.trim(), phone: phone.trim(), tickets: cartItems, promoCode: promoApplied?.code ?? null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");

      if (data.type === "rsvp") {
        setTicketCodes(data.ticketCodes ?? []);
        setStatus("success");
      } else if (data.type === "mpesa") {
        // STK push sent — show waiting screen and start polling
        setTxRef(data.txRef);
        setStatus("waiting_mpesa");
        startPolling(data.txRef);
      }
    } catch (err: any) {
      setErrorMsg(err.message ?? "Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  // ── Waiting for M-Pesa screen ─────────────────────────────────────────
  if (status === "waiting_mpesa") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md flex flex-col items-center gap-6 text-center">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-purple-900/50" />
            <div className="absolute inset-0 rounded-full border-4 border-t-purple-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Smartphone className="w-8 h-8 text-purple-400" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-100 mb-2">Check your phone</h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              An M-Pesa payment prompt has been sent to<br />
              <strong className="text-gray-200">{phone}</strong>.<br />
              Enter your PIN to complete payment of{" "}
              <strong className="text-green-400">KES {total.toLocaleString()}</strong>.
            </p>
          </div>
          <div className="w-full bg-gray-900 border border-gray-700 rounded-2xl p-5">
            <p className="text-gray-500 text-xs mb-3">Waiting for confirmation{".".repeat((Math.floor(pollSeconds / 3) % 3) + 1)}</p>
            <div className="w-full bg-gray-800 rounded-full h-1.5">
              <div
                className="bg-purple-500 h-1.5 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min((pollSeconds / 180) * 100, 100)}%` }}
              />
            </div>
            <p className="text-gray-700 text-xs mt-2">{180 - pollSeconds}s remaining</p>
          </div>
          <p className="text-gray-600 text-xs">
            Don't close this page. You'll be redirected automatically once confirmed.
          </p>
          <button
            onClick={() => { if (pollRef.current) clearInterval(pollRef.current); setStatus("idle"); }}
            className="text-gray-600 hover:text-gray-400 text-sm transition"
          >
            Cancel and go back
          </button>
        </div>
      </div>
    );
  }

  // ── Success screen ────────────────────────────────────────────────────
  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md flex flex-col items-center gap-6 text-center">
          <div className="w-16 h-16 rounded-full bg-green-900/40 border border-green-700/50 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-100 mb-2">
              {isRsvp ? "You're in!" : "Order confirmed!"}
            </h1>
            <p className="text-gray-400 text-sm">
              Confirmation sent to <strong className="text-gray-300">{email}</strong> and
              SMS to <strong className="text-gray-300">{phone}</strong>.
            </p>
          </div>
          <div className="w-full bg-gray-900 border border-gray-700 rounded-2xl p-5 flex flex-col gap-3">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest">Your Tickets</p>
            {ticketCodes.map((code, i) => (
              <Link key={code} href={`/ticket/${code}`}
                className="flex items-center justify-between bg-gray-800 border border-gray-700 hover:border-purple-600 rounded-xl px-4 py-3 transition group">
                <div className="flex items-center gap-3">
                  <Ticket className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="text-gray-300 text-sm font-semibold">Ticket {i + 1}</p>
                    <p className="text-gray-600 font-mono text-xs">{code.slice(0, 8).toUpperCase()}…</p>
                  </div>
                </div>
                <span className="text-purple-400 text-xs font-medium group-hover:text-purple-300 transition">View →</span>
              </Link>
            ))}
          </div>
          <Link href={`/events/${eventId}`} className="text-gray-600 hover:text-gray-400 text-sm transition">
            ← Back to event
          </Link>
        </div>
      </div>
    );
  }

  if (parseError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-6 text-red-300 text-sm max-w-md text-center">
          {parseError}
        </div>
      </div>
    );
  }

  // ── Checkout form ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex justify-center px-4 py-16">
      <div className="w-full max-w-lg flex flex-col gap-5">

        <div>
          <p className="text-gray-500 text-sm mb-1">Checkout</p>
          <h1 className="text-2xl font-bold text-gray-100">{title}</h1>
          <p className="text-gray-500 text-sm mt-1">{date} · {location}</p>
        </div>

        {image && (
          <div className="relative w-full h-44 rounded-xl overflow-hidden">
            <Image src={image} alt={title} fill sizes="(max-width: 768px) 100vw, 512px" className="object-cover brightness-75" />
          </div>
        )}

        {/* Order summary */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 flex flex-col gap-3">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest">Order Summary</p>
          {cartItems.map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm font-semibold">{item.ticketType}</p>
                <p className="text-gray-600 text-xs">{isRsvp ? "" : `${item.quantity} × KES ${item.price}`}</p>
              </div>
              {!isRsvp && (
                <p className="text-gray-300 text-sm font-bold">
                  KES {(parseFloat(String(item.price).replace(/[^0-9.]/g, "")) * item.quantity).toLocaleString()}
                </p>
              )}
            </div>
          ))}
          {!isRsvp && (
            <div className="border-t border-gray-700 pt-3 flex flex-col gap-1">
              {promoApplied && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-400 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" /> {promoApplied.code} ({promoApplied.discount} off)
                  </span>
                  <span className="text-green-400">− KES {discountAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold">
                <span className="text-gray-400">Total</span>
                <span className="text-gray-100">KES {total.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Promo */}
        {!isRsvp && !promoApplied && (
          <div className="flex gap-2">
            <input type="text" placeholder="Promo code" value={promoInput}
              onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
              className={INPUT} />
            <button onClick={handleApplyPromo} disabled={promoLoading || !promoInput.trim()}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-600 text-gray-300 hover:border-purple-500 hover:text-purple-300 text-sm font-medium transition disabled:opacity-40 shrink-0">
              {promoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
              Apply
            </button>
          </div>
        )}
        {promoApplied && (
          <div className="flex items-center justify-between bg-green-900/20 border border-green-700/40 rounded-xl px-4 py-3">
            <span className="text-green-400 text-sm font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> {promoApplied.code} — {promoApplied.discount} off
            </span>
            <button onClick={() => setPromoApplied(null)} className="text-gray-600 hover:text-gray-400 transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {promoError && <p className="text-red-400 text-xs">{promoError}</p>}

        {/* Contact */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 flex flex-col gap-4">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest">Your Details</p>
          <p className="text-gray-600 text-xs -mt-2">
            {isRsvp
              ? "Your ticket will be sent to this email and SMS to your phone."
              : "An M-Pesa payment prompt will be sent to your phone number."}
          </p>
          {[
            { label: "Full Name",      icon: User,  type: "text",  ph: "Jane Doe",                value: name,  set: setName },
            { label: "Email Address",  icon: Mail,  type: "email", ph: "jane@example.com",        value: email, set: setEmail },
            { label: "Phone Number",   icon: Phone, type: "tel",   ph: "+254 712 345 678",        value: phone, set: setPhone },
          ].map(({ label, icon: Icon, type, ph, value, set }) => (
            <div key={label} className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 flex items-center gap-1">
                <Icon className="w-3 h-3" /> {label} *
              </label>
              <input type={type} placeholder={ph} value={value}
                onChange={(e) => set(e.target.value)} className={INPUT} />
            </div>
          ))}
          <p className="text-gray-700 text-xs">Include country code e.g. +254 for Kenya</p>
        </div>

        {!isRsvp && (
          <div className="flex items-start gap-3 bg-blue-900/20 border border-blue-700/30 rounded-xl px-4 py-3">
            <Smartphone className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-blue-300 text-sm">
              After clicking pay, you'll receive an M-Pesa prompt on <strong>{phone || "your phone"}</strong>. Enter your PIN to complete.
            </p>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-start gap-2 bg-red-900/20 border border-red-700/40 rounded-xl px-4 py-3 text-red-300 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {errorMsg}
          </div>
        )}

        <button onClick={handleSubmit} disabled={status === "loading"}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition flex items-center justify-center gap-2 text-sm">
          {status === "loading"
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
            : isRsvp
            ? "Confirm RSVP →"
            : `Pay KES ${total.toLocaleString()} via M-Pesa →`}
        </button>

        <button onClick={() => router.back()} className="text-center text-gray-600 hover:text-gray-400 text-sm transition">
          ← Go back
        </button>
      </div>
    </div>
  );
}