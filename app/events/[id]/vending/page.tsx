"use client";
// app/events/[id]/vending/page.tsx

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Loader2, CheckCircle, AlertTriangle, Smartphone,
  ShoppingBag, ChevronRight, ArrowLeft, BadgeCheck,
  Lock, Copy, Check,
} from "lucide-react";
import ShareSlotButton from "@/components/ShareSlotModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VendingSlot {
  id:           string;
  title:        string;
  description:  string;
  price:        number;
  currency:     string;
  status:       string;
  availability: "available" | "full";
}

interface MyApplication {
  id:           string;
  slotId:       string;
  status:       string;
  businessName: string;
}

// The slots API also returns eventOwnerId for the public page
// We derive isOwner on the client by comparing session user id

type PageView = "list" | "apply" | "waiting_mpesa" | "confirmed";

const INPUT = "w-full bg-gray-800 text-gray-300 rounded-xl border border-gray-700 px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition placeholder-gray-600";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:   "bg-yellow-900/40 text-yellow-400 border-yellow-700/40",
    approved:  "bg-blue-900/40 text-blue-400 border-blue-700/40",
    rejected:  "bg-red-900/40 text-red-400 border-red-700/40",
    paid:      "bg-orange-900/40 text-orange-400 border-orange-700/40",
    confirmed: "bg-green-900/40 text-green-400 border-green-700/40",
    expired:   "bg-gray-800 text-gray-500 border-gray-700",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${map[status] ?? "bg-gray-800 text-gray-400 border-gray-700"}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Copy link button ─────────────────────────────────────────────────────────

function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition shrink-0 ${
        copied
          ? "bg-green-900/30 border-green-700/40 text-green-400"
          : "bg-gray-800 border-gray-700 text-gray-300 hover:border-purple-500 hover:text-purple-300"
      }`}
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function VendingPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const { data: session } = useSession();

  const [slots,        setSlots]        = useState<VendingSlot[]>([]);
  const [myApps,       setMyApps]       = useState<MyApplication[]>([]);
  const [isOwner,      setIsOwner]      = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [view,         setView]         = useState<PageView>("list");
  const [selectedSlot, setSelectedSlot] = useState<VendingSlot | null>(null);
  const [submitError,  setSubmitError]  = useState("");
  const [submitting,   setSubmitting]   = useState(false);

  // Apply form
  const [businessName, setBusinessName] = useState("");
  const [contactName,  setContactName]  = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [description,  setDescription]  = useState("");

  // Payment polling
  const [txRef,       setTxRef]       = useState("");
  const [pollSeconds, setPollSeconds] = useState(0);
  const [payingSlot,  setPayingSlot]  = useState<VendingSlot | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const vendingUrl = typeof window !== "undefined"
    ? `${window.location.origin}/events/${eventId}/vending`
    : `/events/${eventId}/vending`;

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // ── Load slots + detect ownership ────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [slotsRes, myRes, eventRes] = await Promise.all([
          fetch(`/api/vending/slots?eventId=${eventId}`),
          session ? fetch("/api/vending/applications?mine=true") : Promise.resolve(null),
          fetch(`/api/events/${eventId}/owner`),  // lightweight endpoint — see note below
        ]);

        if (slotsRes.ok) setSlots(await slotsRes.json());
        if (myRes?.ok)   setMyApps(await myRes.json());

        // Check ownership via session — compare event createdById
        if (eventRes?.ok) {
          const eventData = await eventRes.json();
          if (session?.user?.email && eventData.ownerEmail === session.user.email) {
            setIsOwner(true);
          }
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [eventId, session]);

  // ── Pre-fill from session ────────────────────────────────────────────────
  useEffect(() => {
    if (session?.user?.email && !contactEmail) setContactEmail(session.user.email);
    if (session?.user?.name  && !contactName)  setContactName(session.user.name);
  }, [session]);

  function myAppForSlot(slotId: string): MyApplication | undefined {
    return myApps.find((a) => a.slotId === slotId);
  }

  // ── Apply ────────────────────────────────────────────────────────────────
  async function handleApply() {
    if (!selectedSlot) return;
    setSubmitError("");
    if (!businessName.trim() || !contactName.trim() || !contactEmail.trim() || !contactPhone.trim() || !description.trim()) {
      setSubmitError("All fields are required."); return;
    }
    setSubmitting(true);
    try {
      const res  = await fetch("/api/vending/applications", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ slotId: selectedSlot.id, businessName, contactName, contactEmail, contactPhone, description }),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error ?? "Failed to submit application."); return; }
      const myRes = await fetch("/api/vending/applications?mine=true");
      if (myRes.ok) setMyApps(await myRes.json());
      setView("list");
      setSelectedSlot(null);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Pay ──────────────────────────────────────────────────────────────────
  async function handlePay(application: MyApplication, slot: VendingSlot) {
    setSubmitError("");
    try {
      const res  = await fetch("/api/vending/applications", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ applicationId: application.id, action: "pay" }),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error ?? "Could not initiate payment."); return; }
      setTxRef(data.txRef);
      setPayingSlot(slot);
      setView("waiting_mpesa");
      startPolling(data.txRef);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    }
  }

  function startPolling(ref: string) {
    let elapsed = 0;
    pollRef.current = setInterval(async () => {
      elapsed += 3;
      setPollSeconds(elapsed);
      if (elapsed >= 180) {
        clearInterval(pollRef.current!);
        setView("list");
        setSubmitError("Payment timed out. Please try again.");
        return;
      }
      try {
        const res  = await fetch(`/api/payment/status?txRef=${ref}`);
        const data = await res.json();
        if (data.status === "successful") {
          clearInterval(pollRef.current!);
          const myRes = await fetch("/api/vending/applications?mine=true");
          if (myRes.ok) setMyApps(await myRes.json());
          setView("confirmed");
        } else if (data.status === "failed") {
          clearInterval(pollRef.current!);
          setView("list");
          setSubmitError("Payment failed or was cancelled. Please try again.");
        }
      } catch { /* keep polling */ }
    }, 3000);
  }

  // ── VIEWS ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
      </div>
    );
  }

  // ── Waiting for M-Pesa ───────────────────────────────────────────────────
  if (view === "waiting_mpesa") {
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
            <h2 className="text-xl font-bold text-gray-100 mb-2">Check your phone</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              An M-Pesa prompt has been sent for<br />
              <strong className="text-gray-200">{payingSlot?.title}</strong>.<br />
              Enter your PIN to pay{" "}
              <strong className="text-green-400">KES {payingSlot?.price.toLocaleString()}</strong>.
            </p>
          </div>
          <div className="w-full bg-gray-900 border border-gray-700 rounded-2xl p-5">
            <p className="text-gray-500 text-xs mb-3">Waiting{".".repeat((Math.floor(pollSeconds / 3) % 3) + 1)}</p>
            <div className="w-full bg-gray-800 rounded-full h-1.5">
              <div className="bg-purple-500 h-1.5 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min((pollSeconds / 180) * 100, 100)}%` }} />
            </div>
            <p className="text-gray-700 text-xs mt-2">{180 - pollSeconds}s remaining</p>
          </div>
          <button onClick={() => { if (pollRef.current) clearInterval(pollRef.current); setView("list"); }}
            className="text-gray-600 hover:text-gray-400 text-sm transition">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Confirmed ─────────────────────────────────────────────────────────────
  if (view === "confirmed") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md flex flex-col items-center gap-6 text-center">
          <div className="w-16 h-16 rounded-full bg-green-900/40 border border-green-700/50 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-100 mb-2">Slot confirmed! 🛒</h2>
            <p className="text-gray-400 text-sm">
              Your vending slot has been booked. A confirmation email has been sent to you.<br />
              The event organiser will contact you with setup details.
            </p>
          </div>
          <button onClick={() => setView("list")}
            className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition">
            Back to slots
          </button>
        </div>
      </div>
    );
  }

  // ── Apply form ────────────────────────────────────────────────────────────
  if (view === "apply" && selectedSlot) {
    return (
      <div className="min-h-screen flex justify-center px-4 py-16">
        <div className="w-full max-w-lg flex flex-col gap-5">
          <button onClick={() => { setView("list"); setSubmitError(""); }}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-300 text-sm transition self-start">
            <ArrowLeft className="w-4 h-4" /> Back to slots
          </button>
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Applying for</p>
            <h1 className="text-xl font-bold text-gray-100">{selectedSlot.title}</h1>
            <p className="text-green-400 font-semibold mt-1">KES {selectedSlot.price.toLocaleString()}</p>
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 flex flex-col gap-4">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest">Business Details</p>
            {([
              { label: "Business Name",  ph: "Mama Fua Fashions",  value: businessName,  set: setBusinessName },
              { label: "Contact Name",   ph: "Jane Doe",           value: contactName,   set: setContactName },
              { label: "Contact Email",  ph: "jane@example.com",   value: contactEmail,  set: setContactEmail },
              { label: "Contact Phone",  ph: "+254 712 345 678",   value: contactPhone,  set: setContactPhone },
            ] as const).map(({ label, ph, value, set }) => (
              <div key={label} className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">{label} *</label>
                <input type="text" placeholder={ph} value={value}
                  onChange={(e) => (set as any)(e.target.value)} className={INPUT} />
              </div>
            ))}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">What will you sell / offer? *</label>
              <textarea rows={4} placeholder="Describe your products or services..."
                value={description} onChange={(e) => setDescription(e.target.value)}
                className={INPUT + " resize-none"} />
            </div>
          </div>
          {submitError && (
            <div className="flex items-start gap-2 bg-red-900/20 border border-red-700/40 rounded-xl px-4 py-3 text-red-300 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {submitError}
            </div>
          )}
          <button onClick={handleApply} disabled={submitting}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition flex items-center justify-center gap-2 text-sm">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : "Submit Application →"}
          </button>
          <p className="text-gray-600 text-xs text-center">
            You'll pay only if the event owner approves your application.
          </p>
        </div>
      </div>
    );
  }

  // ── Slot list ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex justify-center px-4 py-16">
      <div className="w-full max-w-lg flex flex-col gap-6">

        <div className="flex items-center gap-3">
          <Link href={`/events/${eventId}`} className="text-gray-500 hover:text-gray-300 transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-purple-400" /> Vending Slots
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">Apply for a spot to sell at this event.</p>
          </div>
        </div>

        {/* ── Owner banner — share link ─────────────────────────────────── */}
        {isOwner && (
          <div className="bg-purple-900/20 border border-purple-700/40 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-purple-300 text-sm font-semibold">You own this event</p>
                <p className="text-purple-400/70 text-xs mt-0.5">
                  You can't apply to your own slots. Share the link below with vendors.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2">
              <p className="text-gray-400 text-xs truncate flex-1 font-mono">{vendingUrl}</p>
              <CopyLinkButton url={vendingUrl} />
              <ShareSlotButton
                url={vendingUrl}
                title="Vending slots available"
                text="Apply for a vending slot at this event:"
              />
            </div>
          </div>
        )}

        {submitError && (
          <div className="flex items-start gap-2 bg-red-900/20 border border-red-700/40 rounded-xl px-4 py-3 text-red-300 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {submitError}
          </div>
        )}

        {slots.length === 0 ? (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-10 text-center">
            <ShoppingBag className="w-8 h-8 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No vending slots available for this event yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {slots.map((slot) => {
              const myApp    = myAppForSlot(slot.id);
              const isFull   = slot.availability === "full" || slot.status === "closed";
              const canApply = !isFull && !myApp && !!session && !isOwner;

              return (
                <div key={slot.id}
                  className="bg-gray-900 border border-gray-700 rounded-2xl p-5 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-gray-100 font-semibold">{slot.title}</h3>
                      {slot.description && (
                        <p className="text-gray-500 text-sm mt-1">{slot.description}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-green-400 font-bold text-sm">KES {slot.price.toLocaleString()}</p>
                      <span className={`text-xs font-semibold mt-1 block ${isFull ? "text-red-400" : "text-emerald-400"}`}>
                        {isFull ? "Full" : "Available"}
                      </span>
                    </div>
                  </div>

                  {/* My application status */}
                  {myApp && (
                    <div className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-2">
                        <BadgeCheck className="w-4 h-4 text-blue-400" />
                        <span className="text-gray-300 text-sm">Your application</span>
                      </div>
                      <StatusBadge status={myApp.status} />
                    </div>
                  )}

                  {/* Pay button */}
                  {myApp?.status === "approved" && (
                    <button onClick={() => handlePay(myApp, slot)}
                      className="w-full bg-green-700 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 text-sm">
                      <Smartphone className="w-4 h-4" />
                      Pay KES {slot.price.toLocaleString()} via M-Pesa →
                    </button>
                  )}

                  {/* Apply button */}
                  {canApply && (
                    <button
                      onClick={() => { setSelectedSlot(slot); setView("apply"); setSubmitError(""); }}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-600 hover:border-purple-500 text-gray-300 hover:text-purple-300 text-sm font-medium transition">
                      Apply for this slot
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}

                  {/* Sign in prompt */}
                  {!session && !isFull && !isOwner && (
                    <p className="text-gray-600 text-xs text-center">
                      <Link href="/auth/signin" className="text-purple-400 hover:underline">Sign in</Link> to apply
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}