"use client";
// app/events/[id]/vending/page.tsx

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Loader2, CheckCircle, AlertTriangle, Smartphone,
  ShoppingBag, ChevronRight, ArrowLeft, BadgeCheck,
  Lock, Copy, Check,
} from "lucide-react";
import ShareSlotButton from "@/components/ShareSlotModal";

// ─── Types ─────────────────────────────────────────────────────────────────────

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

type PageView = "list" | "apply" | "waiting_mpesa" | "confirmed";

const INPUT =
  "w-full rounded-xl border border-[var(--brand-purple)]/25 bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--brand-purple)] focus:ring-2 focus:ring-[var(--brand-purple)]/10";

// ─── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:   "border-yellow-700/40 bg-yellow-900/30 text-yellow-400",
    approved:  "border-blue-700/40 bg-blue-900/30 text-blue-400",
    rejected:  "border-red-700/40 bg-red-900/30 text-red-400",
    paid:      "border-orange-700/40 bg-orange-900/30 text-orange-400",
    confirmed: "border-emerald-700/40 bg-emerald-900/30 text-emerald-400",
    expired:   "border-[var(--brand-purple)]/20 text-[var(--muted)]",
  };
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${map[status] ?? "border-[var(--brand-purple)]/20 text-[var(--muted)]"}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Copy link button ──────────────────────────────────────────────────────────

function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
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
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
        copied
          ? "border-emerald-700/40 bg-emerald-900/30 text-emerald-400"
          : "border-[var(--brand-purple)]/25 bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--brand-purple)]/60 hover:text-[var(--foreground)]"
      }`}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────

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

  const [businessName, setBusinessName] = useState("");
  const [contactName,  setContactName]  = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [description,  setDescription]  = useState("");

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

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [slotsRes, myRes, eventRes] = await Promise.all([
          fetch(`/api/vending/slots?eventId=${eventId}`),
          session ? fetch("/api/vending/applications?mine=true") : Promise.resolve(null),
          fetch(`/api/events/${eventId}/owner`),
        ]);
        if (slotsRes.ok) setSlots(await slotsRes.json());
        if (myRes?.ok)   setMyApps(await myRes.json());
        if (eventRes?.ok) {
          const eventData = await eventRes.json();
          if (session?.user?.email && eventData.ownerEmail === session.user.email) setIsOwner(true);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [eventId, session]);

  useEffect(() => {
    if (session?.user?.email && !contactEmail) setContactEmail(session.user.email);
    if (session?.user?.name  && !contactName)  setContactName(session.user.name);
  }, [session]);

  function myAppForSlot(slotId: string): MyApplication | undefined {
    return myApps.find(a => a.slotId === slotId);
  }

  async function handleApply() {
    if (!selectedSlot) return;
    setSubmitError("");
    if (!businessName.trim() || !contactName.trim() || !contactEmail.trim() || !contactPhone.trim() || !description.trim()) {
      setSubmitError("All fields are required."); return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/vending/applications", {
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

  async function handlePay(application: MyApplication, slot: VendingSlot) {
    setSubmitError("");
    try {
      const res = await fetch("/api/vending/applications", {
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
        const res = await fetch(`/api/payment/status?txRef=${ref}`);
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

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--brand-purple)]" />
      </div>
    );
  }

  // ── Waiting for M-Pesa ───────────────────────────────────────────────────────

  if (view === "waiting_mpesa") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-16">
        <div className="flex w-full max-w-md flex-col items-center gap-8 text-center">
          <div className="relative h-20 w-20">
            <div className="absolute inset-0 rounded-full border-4 border-[var(--brand-purple)]/20" />
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-t-[var(--brand-purple)]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Smartphone className="h-8 w-8 text-[var(--brand-purple)]" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[var(--foreground)]">Check your phone</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              An M-Pesa prompt has been sent for{" "}
              <strong className="text-[var(--foreground)]">{payingSlot?.title}</strong>.<br />
              Enter your PIN to pay{" "}
              <strong className="text-[var(--brand-green)]">KES {payingSlot?.price.toLocaleString()}</strong>.
            </p>
          </div>
          <div className="w-full rounded-2xl border border-[var(--brand-purple)]/25 bg-[var(--surface)] p-5">
            <p className="mb-3 text-xs text-[var(--muted)]">
              Waiting{".".repeat((Math.floor(pollSeconds / 3) % 3) + 1)}
            </p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--background)]">
              <div
                className="h-1.5 rounded-full bg-[var(--brand-purple)] transition-all duration-1000"
                style={{ width: `${Math.min((pollSeconds / 180) * 100, 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">{180 - pollSeconds}s remaining</p>
          </div>
          <button
            onClick={() => { if (pollRef.current) clearInterval(pollRef.current); setView("list"); }}
            className="text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Confirmed ────────────────────────────────────────────────────────────────

  if (view === "confirmed") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-16">
        <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-700/40 bg-emerald-900/30">
            <CheckCircle className="h-8 w-8 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-[var(--foreground)]">Slot confirmed!</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Your vending slot has been booked. A confirmation email has been sent to you.
              The event organiser will contact you with setup details.
            </p>
          </div>
          <button
            onClick={() => setView("list")}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-purple-600 px-6 text-sm font-bold text-white transition hover:bg-purple-700"
          >
            Back to slots
          </button>
        </div>
      </div>
    );
  }

  // ── Apply form ────────────────────────────────────────────────────────────────

  if (view === "apply" && selectedSlot) {
    return (
      <div className="page-reveal min-h-screen bg-[var(--background)] px-4 py-12 sm:px-6">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
          <button
            onClick={() => { setView("list"); setSubmitError(""); }}
            className="flex items-center gap-2 self-start text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="h-4 w-4" /> Back to slots
          </button>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand-green)]">
              Applying for
            </p>
            <h1 className="mt-1 text-xl font-semibold text-[var(--foreground)]">
              {selectedSlot.title}
            </h1>
            <p className="mt-1 font-semibold text-[var(--brand-green)]">
              KES {selectedSlot.price.toLocaleString()}
            </p>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border border-[var(--brand-purple)]/25 bg-[var(--surface)] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
              Business Details
            </p>
            {([
              { label: "Business Name",  ph: "Mama Fua Fashions",  value: businessName,  set: setBusinessName },
              { label: "Contact Name",   ph: "Jane Doe",           value: contactName,   set: setContactName },
              { label: "Contact Email",  ph: "jane@example.com",   value: contactEmail,  set: setContactEmail },
              { label: "Contact Phone",  ph: "+254 712 345 678",   value: contactPhone,  set: setContactPhone },
            ] as const).map(({ label, ph, value, set }) => (
              <div key={label} className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--muted)]">{label} *</label>
                <input
                  type="text"
                  placeholder={ph}
                  value={value}
                  onChange={e => (set as any)(e.target.value)}
                  className={INPUT}
                />
              </div>
            ))}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--muted)]">What will you sell / offer? *</label>
              <textarea
                rows={4}
                placeholder="Describe your products or services…"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className={INPUT + " resize-none"}
              />
            </div>
          </div>

          {submitError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {submitError}
            </div>
          )}

          <button
            onClick={handleApply}
            disabled={submitting}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-purple-600 text-sm font-bold text-white transition hover:bg-purple-700 disabled:opacity-50"
          >
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : "Submit Application"}
          </button>
          <p className="text-center text-xs text-[var(--muted)]">
            You'll pay only if the event owner approves your application.
          </p>
        </div>
      </div>
    );
  }

  // ── Slot list ─────────────────────────────────────────────────────────────────

  return (
    <div className="page-reveal min-h-screen bg-[var(--background)] px-4 pb-20 pt-4 text-[var(--foreground)] sm:px-6">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href={`/events/${eventId}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--brand-purple)]/25 bg-[var(--surface)] text-[var(--muted)] transition hover:border-[var(--brand-purple)]/50 hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand-green)]">
              Event
            </p>
            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
              Vending Slots
            </h1>
          </div>
        </div>

        {/* Owner banner */}
        {isOwner && (
          <div className="flex flex-col gap-3 rounded-2xl border border-[var(--brand-purple)]/40 bg-[var(--brand-purple)]/10 p-4">
            <div className="flex items-start gap-2">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-purple)]" />
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">You own this event</p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  You can't apply to your own slots. Share the link below with vendors.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-[var(--brand-purple)]/25 bg-[var(--surface)] px-3 py-2">
              <p className="flex-1 truncate font-mono text-xs text-[var(--muted)]">{vendingUrl}</p>
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
          <div className="flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {submitError}
          </div>
        )}

        {/* Slots */}
        {slots.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--brand-purple)]/45 bg-[var(--surface)] px-6 py-20 text-center">
            <ShoppingBag className="h-8 w-8 text-[var(--muted)]" />
            <p className="text-sm text-[var(--muted)]">No vending slots available for this event yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {slots.map(slot => {
              const myApp    = myAppForSlot(slot.id);
              const isFull   = slot.availability === "full" || slot.status === "closed";
              const canApply = !isFull && !myApp && !!session && !isOwner;

              return (
                <div
                  key={slot.id}
                  className="flex flex-col gap-4 rounded-xl border border-[var(--brand-purple)]/25 bg-[var(--surface)] p-5 transition duration-200 hover:border-[var(--brand-purple)]/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-[var(--foreground)]">{slot.title}</h3>
                      {slot.description && (
                        <p className="mt-1 text-sm text-[var(--muted)]">{slot.description}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-[var(--brand-green)]">
                        KES {slot.price.toLocaleString()}
                      </p>
                      <span className={`mt-1 block text-xs font-semibold ${isFull ? "text-red-400" : "text-emerald-400"}`}>
                        {isFull ? "Full" : "Available"}
                      </span>
                    </div>
                  </div>

                  {/* My application */}
                  {myApp && (
                    <div className="flex items-center justify-between rounded-xl border border-[var(--brand-purple)]/15 bg-[var(--background)] px-4 py-3">
                      <div className="flex items-center gap-2">
                        <BadgeCheck className="h-4 w-4 text-blue-400" />
                        <span className="text-sm text-[var(--foreground)]">Your application</span>
                      </div>
                      <StatusBadge status={myApp.status} />
                    </div>
                  )}

                  {/* Pay button */}
                  {myApp?.status === "approved" && (
                    <button
                      onClick={() => handlePay(myApp, slot)}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 text-sm font-bold text-white transition hover:bg-emerald-600"
                    >
                      <Smartphone className="h-4 w-4" />
                      Pay KES {slot.price.toLocaleString()} via M-Pesa
                    </button>
                  )}

                  {/* Apply button */}
                  {canApply && (
                    <button
                      onClick={() => { setSelectedSlot(slot); setView("apply"); setSubmitError(""); }}
                      className="flex h-11 w-full items-center justify-between rounded-xl border border-[var(--brand-purple)]/25 px-4 text-sm font-medium text-[var(--muted)] transition hover:border-[var(--brand-purple)] hover:text-[var(--foreground)]"
                    >
                      Apply for this slot
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}

                  {/* Sign in prompt */}
                  {!session && !isFull && !isOwner && (
                    <p className="text-center text-xs text-[var(--muted)]">
                      <Link href="/auth/signin" className="font-semibold text-[var(--brand-purple)] hover:text-[var(--foreground)]">
                        Sign in
                      </Link>{" "}
                      to apply
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