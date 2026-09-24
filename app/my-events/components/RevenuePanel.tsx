"use client";
// app/my-events/components/RevenuePanel.tsx

import React, { useState, useEffect, useCallback } from "react";
import {
  Send, CheckCircle, Mail, Wallet, ArrowDownCircle,
  TrendingUp, Clock, AlertTriangle, Loader2, ShieldCheck,
  Eye, EyeOff, RefreshCw, X, Lock,
} from "lucide-react";
import { ManagedEvent } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WalletData {
  balance:            number;
  totalEarned:        number;
  totalWithdrawn:     number;
  transactions:       Transaction[];
  withdrawalRequests: WithdrawalRequest[];
}

interface Transaction {
  id:           string;
  type:         string;
  amount:       number;
  description:  string;
  balanceAfter: number;
  createdAt:    string;
}

interface WithdrawalRequest {
  id:          string;
  amount:      number;
  method:      string;
  status:      string;
  failureNote: string | null;
  createdAt:   string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return new Date(dateStr).toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

const TX_COLORS: Record<string, string> = {
  credit:       "text-[var(--brand-green)]",
  withdrawal:   "text-red-400",
  platform_fee: "text-[var(--muted)]",
  refund:       "text-blue-400",
};

const WD_COLORS: Record<string, string> = {
  pending:    "bg-amber-900/30 border-amber-700/40 text-amber-400",
  processing: "bg-blue-900/30 border-blue-700/40 text-blue-400",
  completed:  "bg-green-900/30 border-green-700/40 text-green-400",
  failed:     "bg-red-900/30 border-red-700/40 text-red-400",
};

const INPUT = "w-full bg-white/5 border border-gray-400/50 rounded-xl px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)] text-sm outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/30 transition";

// ─── Withdrawal modal ─────────────────────────────────────────────────────────

function WithdrawModal({ balance, onClose, onSuccess }: {
  balance:   number;
  onClose:   () => void;
  onSuccess: () => void;
}) {
  const [step,       setStep]       = useState<"form" | "confirm" | "done">("form");
  const [amount,     setAmount]     = useState("");
  const [phone,      setPhone]      = useState("");
  const [showPhone,  setShowPhone]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");

  function validate(): string | null {
    const num = Number(amount);
    if (!amount || isNaN(num))     return "Enter a valid amount.";
    if (num < 100)                 return "Minimum withdrawal is KES 100.";
    if (num > balance)             return `Amount exceeds your balance of ${fmt(balance)}.`;
    if (!phone.trim())             return "Enter your M-Pesa phone number.";
    const normalized = phone.trim().replace(/^\+/, "").replace(/\s/g, "");
    if (!/^254\d{9}$/.test(normalized))
      return "Phone must be a valid Kenyan number starting with 254 (e.g. 254712345678).";
    return null;
  }

  function handleProceed() {
    setError("");
    const err = validate();
    if (err) { setError(err); return; }
    setStep("confirm");
  }

  async function handleConfirm() {
    setError(""); setSubmitting(true);
    try {
      const res  = await fetch("/api/vending/withdraw", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          phone:  phone.trim().replace(/^\+/, "").replace(/\s/g, ""),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Withdrawal failed."); setStep("form"); return; }
      setStep("done");
    } catch {
      setError("Network error. Please try again.");
      setStep("form");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const normalized  = phone.trim().replace(/^\+/, "").replace(/\s/g, "");
  const maskedPhone = normalized.length >= 6
    ? normalized.slice(0, 3) + "****" + normalized.slice(-3)
    : "****";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-gray-900 border border-gray-400/20 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--brand-purple)]/25">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[var(--brand-green)]" />
            <h3 className="text-[var(--foreground)] font-bold">Withdraw Earnings</h3>
          </div>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--foreground)] transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">

          {/* Step: Form */}
          {step === "form" && (
            <div className="flex flex-col gap-4">
              <div className="bg-white/2 border border-gray-400/20 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-[var(--muted)] text-sm">Available balance</span>
                <span className="text-[var(--brand-green)] font-black text-lg">{fmt(balance)}</span>
              </div>

              <div>
                <label className="block text-[var(--muted)] text-xs font-semibold mb-1.5 uppercase tracking-wider">
                  Amount (KES) *
                </label>
                <input
                  type="number" min="100" max={balance} step="1"
                  value={amount} onChange={e => setAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  className={INPUT}
                />
                <div className="flex gap-2 mt-2">
                  {[1000, 2500, 5000].map(preset => (
                    <button key={preset} type="button"
                      onClick={() => setAmount(String(Math.min(preset, balance)))}
                      disabled={balance < preset}
                      className="flex-1 text-xs bg-white/5 border border-gray-400/50 rounded-lg py-1.5 text-[var(--muted)] hover:border-purple-600 hover:text-purple-600 disabled:opacity-30 transition">
                      {fmt(preset)}
                    </button>
                  ))}
                  <button type="button"
                    onClick={() => setAmount(String(Math.floor(balance)))}
                    className="flex-1 text-xs bg-white/5 border border-gray-400/50 rounded-lg py-1.5 text-[var(--muted)] hover:border-purple-600 hover:text-purple-600 transition">
                    Max
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[var(--muted)] text-xs font-semibold mb-1.5 uppercase tracking-wider">
                  M-Pesa Phone Number *
                </label>
                <div className="relative">
                  <input
                    type={showPhone ? "text" : "password"}
                    value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="254712345678"
                    className={`${INPUT} pr-10`}
                  />
                  <button type="button" onClick={() => setShowPhone(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] transition">
                    {showPhone ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[var(--muted)] text-xs mt-1 opacity-60">Format: 254712345678 (no + or spaces)</p>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-900/20 border border-red-800/50 rounded-xl px-3 py-2.5 text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              <div className="flex items-start gap-2 bg-white/2 border border-gray-400/20 rounded-xl px-3 py-2.5">
                <Lock className="w-3.5 h-3.5 text-[var(--muted)] shrink-0 mt-0.5" />
                <p className="text-[var(--muted)] text-xs opacity-70">
                  Your phone number is encrypted before being stored. It is never exposed in logs or responses.
                </p>
              </div>

              <button onClick={handleProceed} disabled={!amount || !phone}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold py-3 rounded-xl text-sm transition duration-300">
                <ShieldCheck className="w-4 h-4" /> Review Withdrawal
              </button>
            </div>
          )}

          {/* Step: Confirm */}
          {step === "confirm" && (
            <div className="flex flex-col gap-4">
              <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl px-4 py-3">
                <p className="text-amber-400 text-sm font-semibold mb-1">Confirm your withdrawal</p>
                <p className="text-amber-300/70 text-xs">This action cannot be undone. Please verify the details below.</p>
              </div>

              <div className="bg-white/2 border border-gray-400/20 rounded-xl divide-y divide-gray-400/10 overflow-hidden">
                {[
                  { label: "Amount",           value: fmt(Number(amount)) },
                  { label: "Destination",      value: `M-Pesa ${maskedPhone}` },
                  { label: "Remaining balance",value: fmt(balance - Number(amount)) },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-3">
                    <span className="text-[var(--muted)] text-sm">{row.label}</span>
                    <span className="text-[var(--foreground)] text-sm font-semibold">{row.value}</span>
                  </div>
                ))}
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-900/20 border border-red-800/50 rounded-xl px-3 py-2.5 text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep("form")} disabled={submitting}
                  className="flex-1 py-3 rounded-xl border border-gray-400/50 text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--foreground)] text-sm font-semibold transition duration-300 disabled:opacity-40">
                  Go back
                </button>
                <button onClick={handleConfirm} disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white font-bold py-3 rounded-xl text-sm transition duration-300">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {submitting ? "Processing…" : "Confirm"}
                </button>
              </div>
            </div>
          )}

          {/* Step: Done */}
          {step === "done" && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="w-16 h-16 bg-green-900/30 border border-green-700/30 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <div>
                <p className="text-[var(--foreground)] font-bold text-lg">Withdrawal initiated</p>
                <p className="text-[var(--muted)] text-sm mt-1">
                  {fmt(Number(amount))} is being sent to your M-Pesa. This usually takes a few minutes.
                </p>
              </div>
              <button onClick={() => { onClose(); onSuccess(); }}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl text-sm transition duration-300">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main RevenuePanel ────────────────────────────────────────────────────────

export function RevenuePanel({ event }: { event: ManagedEvent }) {
  const [wallet,        setWallet]        = useState<WalletData | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletError,   setWalletError]   = useState("");
  const [showWithdraw,  setShowWithdraw]  = useState(false);
  const [showTxHistory, setShowTxHistory] = useState(false);
  const [message,       setMessage]       = useState("");
  const [sent,          setSent]          = useState(false);
  const [sending,       setSending]       = useState(false);

  const fetchWallet = useCallback(async () => {
    setWalletLoading(true); setWalletError("");
    try {
      const res = await fetch("/api/vending/wallet");
      if (!res.ok) throw new Error("Failed to load wallet");
      setWallet(await res.json());
    } catch (err: any) {
      setWalletError(err.message);
    } finally {
      setWalletLoading(false);
    }
  }, []);

  useEffect(() => { fetchWallet(); }, [fetchWallet]);

  const paidTickets = event.tickets.filter(t => t.type !== "RSVP");
  const gross       = paidTickets.reduce((s, t) => {
    const price = parseFloat(t.price.replace(/[^0-9.]/g, "")) || 0;
    return s + price * t.capacity;
  }, 0);
  const commission = gross * 0.05;
  const net        = gross - commission;

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    await new Promise(r => setTimeout(r, 1000));
    setSent(true); setSending(false); setMessage("");
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <div className="flex flex-col gap-6">

      {/* Event revenue summary */}
      {event.stats.isRsvp ? (
        <div className="bg-white/2 border border-gray-400/20 rounded-xl px-4 py-4">
          <p className="text-[var(--foreground)] font-semibold text-sm">Free RSVP Event</p>
          <p className="text-[var(--muted)] text-sm mt-1">No ticket revenue — attendees join for free.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Gross revenue", value: fmt(gross),      color: "text-[var(--foreground)]",   note: "Before fees" },
              { label: "Platform fee",  value: fmt(commission), color: "text-[var(--muted)]",        note: "5% commission" },
              { label: "Your earnings", value: fmt(net),        color: "text-[var(--brand-green)]",  note: "Net payout" },
            ].map(({ label, value, color, note }) => (
              <div key={label} className="bg-white/2 border border-gray-400/20 rounded-xl p-3">
                <p className={`text-sm font-bold ${color}`}>{value}</p>
                <p className="text-xs text-[var(--foreground)] mt-1">{label}</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">{note}</p>
              </div>
            ))}
          </div>

          {paidTickets.map(t => {
            const price     = parseFloat(t.price.replace(/[^0-9.]/g, "")) || 0;
            const rev       = price * t.capacity;
            const ticketNet = rev * 0.95;
            const pct       = gross > 0 ? (rev / gross) * 100 : 0;
            return (
              <div key={t.id} className="bg-white/2 border border-gray-400/20 rounded-xl px-4 py-3">
                <div className="flex justify-between items-start mb-2.5">
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{t.type}</p>
                    <p className="text-xs text-[var(--muted)] mt-0.5">{t.capacity} tickets · {t.price} each</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[var(--brand-green)]">{fmt(ticketNet)}</p>
                    <p className="text-xs text-[var(--muted)] opacity-60">net revenue</p>
                  </div>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-[3px]">
                  <div className="h-[3px] bg-purple-600 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-[var(--muted)] mt-1 opacity-60">{Math.round(pct)}% of total gross</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="border-t border-[var(--brand-purple)]/25" />

      {/* Wallet section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-purple-600" />
            <p className="text-[var(--foreground)] font-bold text-sm">Your Wallet</p>
          </div>
          <button onClick={fetchWallet} disabled={walletLoading}
            className="text-[var(--muted)] hover:text-[var(--foreground)] transition disabled:opacity-40">
            <RefreshCw className={`w-3.5 h-3.5 ${walletLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {walletError && (
          <div className="flex items-center gap-2 bg-red-900/20 border border-red-800/50 rounded-xl px-3 py-2 text-red-400 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {walletError}
          </div>
        )}

        {walletLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
          </div>
        ) : wallet && (
          <>
            {/* Balance cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Available",    value: wallet.balance,        color: "text-[var(--brand-green)]", icon: <Wallet className="w-4 h-4" /> },
                { label: "Total earned", value: wallet.totalEarned,    color: "text-purple-600",           icon: <TrendingUp className="w-4 h-4" /> },
                { label: "Withdrawn",    value: wallet.totalWithdrawn, color: "text-[var(--muted)]",       icon: <ArrowDownCircle className="w-4 h-4" /> },
              ].map(({ label, value, color, icon }) => (
                <div key={label} className="bg-white/2 border border-gray-400/20 rounded-xl p-3">
                  <div className={`${color} mb-1`}>{icon}</div>
                  <p className={`text-sm font-black ${color}`}>{fmt(value)}</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Withdraw button */}
            <button
              onClick={() => setShowWithdraw(true)}
              disabled={wallet.balance < 100}
              className="w-full flex items-center justify-center gap-2 bg-green-700 hover:bg-green-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-sm transition duration-300"
            >
              <ArrowDownCircle className="w-4 h-4" />
              {wallet.balance < 100
                ? "Minimum balance for withdrawal is KES 100"
                : `Withdraw ${fmt(wallet.balance)}`}
            </button>

            {/* Recent withdrawals */}
            {wallet.withdrawalRequests.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-[var(--muted)] text-xs font-semibold uppercase tracking-widest">Recent Withdrawals</p>
                {wallet.withdrawalRequests.slice(0, 3).map(wd => (
                  <div key={wd.id} className="flex items-center justify-between bg-white/2 border border-gray-400/20 rounded-xl px-3 py-2.5">
                    <div>
                      <p className="text-[var(--foreground)] text-sm font-semibold">{fmt(wd.amount)}</p>
                      <p className="text-[var(--muted)] text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {relativeTime(wd.createdAt)}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${WD_COLORS[wd.status] ?? "bg-white/5 border-gray-400/20 text-[var(--muted)]"}`}>
                      {wd.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Transaction history toggle */}
            {wallet.transactions.length > 0 && (
              <div>
                <button onClick={() => setShowTxHistory(v => !v)}
                  className="text-purple-600 hover:opacity-80 text-xs font-semibold transition flex items-center gap-1">
                  {showTxHistory ? "Hide" : "Show"} transaction history ({wallet.transactions.length})
                </button>

                {showTxHistory && (
                  <div className="mt-3 flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
                    {wallet.transactions.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between bg-white/2 border border-gray-400/10 rounded-xl px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[var(--muted)] text-xs truncate">{tx.description}</p>
                          <p className="text-[var(--muted)] text-xs opacity-50">{relativeTime(tx.createdAt)}</p>
                        </div>
                        <p className={`text-xs font-bold ml-3 shrink-0 ${TX_COLORS[tx.type] ?? "text-[var(--muted)]"}`}>
                          {tx.amount > 0 ? "+" : ""}{fmt(Math.abs(tx.amount))}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="border-t border-[var(--brand-purple)]/25" />

      {/* Message attendees */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/5 border border-gray-400/20 flex items-center justify-center">
            <Mail className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">Message Attendees</p>
            <p className="text-xs text-[var(--muted)]">Send an update to all {event.attendees} people attending</p>
          </div>
        </div>
        <textarea
          value={message} onChange={e => setMessage(e.target.value)}
          placeholder={`Hey everyone! A quick update about "${event.title}"...`}
          rows={4}
          className="w-full bg-white/5 border border-gray-400/50 text-[var(--foreground)] rounded-xl px-4 py-3 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/30 text-sm resize-none placeholder:text-[var(--muted)] transition"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--muted)] opacity-60">
            {message.length} characters · {event.attendees} recipient{event.attendees !== 1 ? "s" : ""}
          </p>
          <button onClick={handleSend} disabled={!message.trim() || sending}
            className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-xl border transition duration-300 ${
              sent
                ? "bg-green-900/20 border-green-700/30 text-green-400"
                : "bg-purple-600 hover:bg-purple-700 border-purple-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
            }`}>
            {sent
              ? <><CheckCircle className="w-4 h-4" /> Sent!</>
              : sending ? "Sending..."
              : <><Send className="w-4 h-4" /> Send message</>
            }
          </button>
        </div>
      </div>

      {/* Withdrawal modal */}
      {showWithdraw && wallet && (
        <WithdrawModal
          balance={wallet.balance}
          onClose={() => setShowWithdraw(false)}
          onSuccess={fetchWallet}
        />
      )}
    </div>
  );
}