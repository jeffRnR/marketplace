"use client";
// app/marketplace/dashboard/components/WalletTab.tsx

import { useState, useEffect, useCallback } from "react";
import {
  Wallet, ArrowDownCircle, TrendingUp, Clock, ShieldCheck,
  RefreshCw, Lock, AlertTriangle, CheckCircle, Eye, EyeOff,
  Loader2, AlertCircle, X,
} from "lucide-react";
import { WalletData, fmtKES, relTime } from "./types";

// ─── Status colours ───────────────────────────────────────────────────────────

const TX_CLR: Record<string, string> = {
  credit: "text-green-400", withdrawal: "text-red-400",
  platform_fee: "text-gray-500", refund: "text-blue-400",
};
const WD_CLR: Record<string, string> = {
  pending:    "bg-amber-900/30 border-amber-700/40 text-amber-400",
  processing: "bg-blue-900/30 border-blue-700/40 text-blue-400",
  completed:  "bg-green-900/30 border-green-700/40 text-green-400",
  failed:     "bg-red-900/30 border-red-700/40 text-red-400",
};

// ─── Withdraw Modal ───────────────────────────────────────────────────────────

function WithdrawModal({ balance, onClose, onSuccess }: {
  balance: number; onClose: () => void; onSuccess: () => void;
}) {
  const [step,       setStep]       = useState<"form"|"confirm"|"done">("form");
  const [amount,     setAmount]     = useState("");
  const [phone,      setPhone]      = useState("");
  const [showPhone,  setShowPhone]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");

  function validate() {
    const n = Number(amount);
    if (!amount || isNaN(n))       return "Enter a valid amount.";
    if (n < 100)                   return "Minimum withdrawal is KES 100.";
    if (n > balance)               return `Exceeds available balance of ${fmtKES(balance)}.`;
    if (!phone.trim())             return "Enter your M-Pesa number.";
    const norm = phone.trim().replace(/^\+/, "").replace(/\s/g, "");
    if (!/^254\d{9}$/.test(norm))  return "Must be a valid Kenyan number e.g. 254712345678.";
    return null;
  }

  function handleProceed() {
    setError(""); const err = validate(); if (err) { setError(err); return; } setStep("confirm");
  }

  async function handleConfirm() {
    setError(""); setSubmitting(true);
    try {
      const res  = await fetch("/api/vending/withdraw", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          phone:  phone.trim().replace(/^\+/, "").replace(/\s/g, ""),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Withdrawal failed."); setStep("form"); return; }
      setStep("done");
    } catch { setError("Network error. Please try again."); setStep("form"); }
    finally { setSubmitting(false); }
  }

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const norm        = phone.trim().replace(/^\+/, "").replace(/\s/g, "");
  const maskedPhone = norm.length >= 6 ? norm.slice(0, 3) + "****" + norm.slice(-3) : "****";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Sheet slides up from bottom on mobile, centered modal on sm+ */}
      <div className="w-full sm:max-w-md bg-gray-950 border border-gray-800 sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green-400 shrink-0" />
            <h3 className="text-gray-100 font-bold text-sm">Withdraw Earnings</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition p-1 -mr-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[85vh]">
          {step === "form" && (
            <div className="flex flex-col gap-4">
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-gray-400 text-sm">Available</span>
                <span className="text-green-400 font-black text-lg">{fmtKES(balance)}</span>
              </div>

              <div>
                <label className="block text-gray-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                  Amount (KES) *
                </label>
                <input
                  type="number" min="100" max={balance} value={amount}
                  onChange={e => setAmount(e.target.value)} placeholder="e.g. 5000"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 text-sm focus:outline-none focus:border-purple-600"
                />
                {/* Quick-pick buttons — 2 per row on xs, 4 on sm */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                  {[1000, 2500, 5000].map(p => (
                    <button
                      key={p} type="button"
                      onClick={() => setAmount(String(Math.min(p, balance)))}
                      disabled={balance < p}
                      className="text-xs bg-gray-800 border border-gray-700 rounded-lg py-2 text-gray-400 hover:border-purple-600 hover:text-purple-400 disabled:opacity-30 transition"
                    >
                      {fmtKES(p)}
                    </button>
                  ))}
                  <button
                    type="button" onClick={() => setAmount(String(Math.floor(balance)))}
                    className="text-xs bg-gray-800 border border-gray-700 rounded-lg py-2 text-gray-400 hover:border-purple-600 hover:text-purple-400 transition"
                  >
                    Max
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                  M-Pesa Number *
                </label>
                <div className="relative">
                  <input
                    type={showPhone ? "text" : "password"} value={phone}
                    onChange={e => setPhone(e.target.value)} placeholder="254712345678"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 pr-10 text-gray-200 text-sm focus:outline-none focus:border-purple-600"
                  />
                  <button
                    type="button" onClick={() => setShowPhone(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                  >
                    {showPhone ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-gray-600 text-xs mt-1">Format: 254712345678</p>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-900/20 border border-red-700/30 rounded-xl px-3 py-2 text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
                </div>
              )}

              <div className="flex items-start gap-2 bg-gray-800/40 border border-gray-700 rounded-xl px-3 py-2">
                <Lock className="w-3.5 h-3.5 text-gray-500 shrink-0 mt-0.5" />
                <p className="text-gray-600 text-xs">Your phone number is encrypted before storage and never exposed in responses.</p>
              </div>

              <button
                onClick={handleProceed} disabled={!amount || !phone}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold py-3.5 rounded-xl text-sm transition"
              >
                <ShieldCheck className="w-4 h-4" /> Review Withdrawal
              </button>
            </div>
          )}

          {step === "confirm" && (
            <div className="flex flex-col gap-4">
              <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl px-4 py-3">
                <p className="text-amber-400 text-sm font-semibold mb-1">Confirm withdrawal</p>
                <p className="text-amber-300/70 text-xs">This action cannot be undone.</p>
              </div>
              <div className="bg-gray-800 rounded-xl divide-y divide-gray-700 overflow-hidden">
                {[
                  { label: "Amount",        value: fmtKES(Number(amount)) },
                  { label: "Destination",   value: `M-Pesa ${maskedPhone}` },
                  { label: "Balance after", value: fmtKES(balance - Number(amount)) },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-3">
                    <span className="text-gray-500 text-sm">{row.label}</span>
                    <span className="text-gray-200 text-sm font-semibold">{row.value}</span>
                  </div>
                ))}
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-900/20 border border-red-700/30 rounded-xl px-3 py-2 text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("form")} disabled={submitting}
                  className="flex-1 py-3.5 rounded-xl border border-gray-700 text-gray-400 hover:text-gray-200 text-sm font-semibold transition disabled:opacity-40"
                >
                  Go back
                </button>
                <button
                  onClick={handleConfirm} disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white font-bold py-3.5 rounded-xl text-sm transition"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {submitting ? "Processing…" : "Confirm"}
                </button>
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <div>
                <p className="text-gray-100 font-bold text-lg">Withdrawal initiated</p>
                <p className="text-gray-400 text-sm mt-1">{fmtKES(Number(amount))} is being sent to your M-Pesa.</p>
              </div>
              <button
                onClick={() => { onClose(); onSuccess(); }}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl text-sm transition"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Wallet Tab ───────────────────────────────────────────────────────────────

export default function WalletTab() {
  const [wallet,        setWallet]        = useState<WalletData | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [showWithdraw,  setShowWithdraw]  = useState(false);
  const [showTxHistory, setShowTxHistory] = useState(false);

  const fetchWallet = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/vending/wallet");
      if (!res.ok) throw new Error("Failed to load wallet");
      setWallet(await res.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchWallet(); }, [fetchWallet]);

  if (loading) return (
    <div className="flex justify-center py-16">
      <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
    </div>
  );

  if (error) return (
    <div className="flex items-center gap-2 bg-red-900/20 border border-red-700/30 rounded-xl px-4 py-3 text-red-400 text-sm">
      <AlertCircle className="w-4 h-4 shrink-0" /> {error}
    </div>
  );

  const w = wallet ?? { balance: 0, totalEarned: 0, totalWithdrawn: 0, transactions: [], withdrawalRequests: [] };

  return (
    <div className="space-y-5">

      {/* ── Balance cards: stacked on mobile, row on sm+ ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Available balance gets hero treatment on mobile */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-4">
          <div className="flex items-center justify-between sm:block">
            <div className="flex items-center gap-2 text-gray-500">
              <Wallet className="w-4 h-4" />
              <span className="text-gray-500 text-xs sm:hidden">Available</span>
            </div>
            <p className="text-green-400 text-xs font-black sm:mt-2">{fmtKES(w.balance)}</p>
          </div>
          <p className="text-gray-500 text-xs mt-1 hidden sm:block">Available</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <div className="flex items-center justify-between sm:block">
            <div className="flex items-center gap-2 text-gray-500">
              <TrendingUp className="w-4 h-4" />
              <span className="text-gray-500 text-xs sm:hidden">Total earned</span>
            </div>
            <p className="text-green-400 font-black sm:mt-2 text-xs">{fmtKES(w.totalEarned)}</p>
          </div>
          <p className="text-gray-500 text-xs mt-1 hidden sm:block">Total earned</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <div className="flex items-center justify-between sm:block">
            <div className="flex items-center gap-2 text-gray-500">
              <ArrowDownCircle className="w-4 h-4" />
              <span className="text-gray-500 text-xs sm:hidden">Withdrawn</span>
            </div>
            <p className="text-green-400 font-black text-xs sm:text-base sm:mt-2">{fmtKES(w.totalWithdrawn)}</p>
          </div>
          <p className="text-gray-500 text-xs mt-1 hidden sm:block">Withdrawn</p>
        </div>
      </div>

      {/* ── Withdraw button row ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={fetchWallet} title="Refresh"
          className="p-2.5 rounded-xl border border-gray-700 text-gray-500 hover:text-gray-300 transition shrink-0"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowWithdraw(true)} disabled={w.balance < 100}
          className="flex-1 flex items-center justify-center gap-2 bg-green-700 hover:bg-green-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl text-sm transition"
        >
          <ArrowDownCircle className="w-4 h-4 shrink-0" />
          <span className="truncate">
            {w.balance < 100 ? "Min. KES 100 to withdraw" : `Withdraw ${fmtKES(w.balance)}`}
          </span>
        </button>
      </div>

      {/* ── How earnings work ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
        <p className="text-gray-300 text-sm font-semibold mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" /> How earnings work
        </p>
        <div className="space-y-2 text-gray-500 text-xs leading-relaxed">
          <p>• When a client pays via M-Pesa, 95% is credited to your wallet automatically.</p>
          <p>• The remaining <span className="text-gray-400 font-semibold">5%</span> is a platform fee.</p>
          <p>• Withdraw anytime once your balance reaches KES 100.</p>
          <p>• Payouts are processed within minutes.</p>
        </div>
      </div>

      {/* ── Recent withdrawals ── */}
      {w.withdrawalRequests.length > 0 && (
        <div className="space-y-2">
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest">Recent Withdrawals</p>
          {w.withdrawalRequests.slice(0, 5).map(wd => (
            <div key={wd.id} className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 gap-3">
              <div className="min-w-0">
                <p className="text-gray-200 text-sm font-semibold">{fmtKES(wd.amount)}</p>
                <p className="text-gray-600 text-xs flex items-center gap-1 mt-0.5 flex-wrap">
                  <Clock className="w-3 h-3 shrink-0" /> {relTime(wd.createdAt)}
                  {wd.failureNote && <span className="text-red-400">· {wd.failureNote}</span>}
                </p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold shrink-0 ${WD_CLR[wd.status] ?? "bg-gray-800 border-gray-700 text-gray-500"}`}>
                {wd.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Transaction history ── */}
      {w.transactions.length > 0 && (
        <div>
          <button
            onClick={() => setShowTxHistory(v => !v)}
            className="text-purple-400 hover:text-purple-300 text-xs font-semibold transition flex items-center gap-1 mb-3"
          >
            {showTxHistory ? "Hide" : "Show"} full transaction history ({w.transactions.length})
          </button>
          {showTxHistory && (
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {w.transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-gray-400 text-xs truncate">{tx.description}</p>
                    <p className="text-gray-600 text-xs mt-0.5">{relTime(tx.createdAt)}</p>
                  </div>
                  <p className={`text-xs font-bold shrink-0 ${TX_CLR[tx.type] ?? "text-gray-400"}`}>
                    {tx.amount > 0 ? "+" : ""}{fmtKES(Math.abs(tx.amount))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {w.transactions.length === 0 && w.balance === 0 && (
        <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-2xl">
          <Wallet className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 font-semibold">No earnings yet</p>
          <p className="text-gray-600 text-sm mt-1">Your wallet will be credited when clients pay for bookings.</p>
        </div>
      )}

      {showWithdraw && (
        <WithdrawModal
          balance={w.balance}
          onClose={() => setShowWithdraw(false)}
          onSuccess={fetchWallet}
        />
      )}
    </div>
  );
}