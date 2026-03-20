"use client";
// app/vending/wallet/page.tsx
// Wallet dashboard — M-Pesa only withdrawals (Kenya focus via IntaSend B2C)

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Loader2, Wallet, ArrowDownLeft, ArrowUpRight,
  CheckCircle, AlertTriangle, Clock, XCircle,
  ChevronDown, ChevronUp, Smartphone,
} from "lucide-react";

interface WalletTransaction {
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

interface WalletData {
  balance:            number;
  totalEarned:        number;
  totalWithdrawn:     number;
  transactions:       WalletTransaction[];
  withdrawalRequests: WithdrawalRequest[];
}

const INPUT = "w-full bg-gray-800 text-gray-300 rounded-xl border border-gray-700 px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition placeholder-gray-600";

function txTypeStyle(type: string): { color: string; prefix: string } {
  if (type === "credit")       return { color: "text-green-400",  prefix: "+" };
  if (type === "platform_fee") return { color: "text-orange-400", prefix: "−" };
  if (type === "withdrawal")   return { color: "text-red-400",    prefix: "−" };
  if (type === "refund")       return { color: "text-blue-400",   prefix: "+" };
  return { color: "text-gray-400", prefix: "" };
}

function WithdrawalBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending:    "bg-yellow-900/40 text-yellow-400 border-yellow-700/40",
    processing: "bg-blue-900/40 text-blue-400 border-blue-700/40",
    completed:  "bg-green-900/40 text-green-400 border-green-700/40",
    failed:     "bg-red-900/40 text-red-400 border-red-700/40",
  };
  const icons: Record<string, React.ReactNode> = {
    pending:    <Clock className="w-3 h-3" />,
    processing: <Loader2 className="w-3 h-3 animate-spin" />,
    completed:  <CheckCircle className="w-3 h-3" />,
    failed:     <XCircle className="w-3 h-3" />,
  };
  return (
    <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${styles[status] ?? "bg-gray-800 text-gray-400 border-gray-700"}`}>
      {icons[status]} {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function WalletPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [wallet,        setWallet]        = useState<WalletData | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [showForm,      setShowForm]      = useState(false);
  const [phone,         setPhone]         = useState("");
  const [amount,        setAmount]        = useState("");
  const [submitting,    setSubmitting]    = useState(false);
  const [submitError,   setSubmitError]   = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [showHistory,   setShowHistory]   = useState(false);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/auth/signin");
  }, [authStatus]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/vending/wallet");
        if (res.ok) setWallet(await res.json());
      } finally {
        setLoading(false);
      }
    }
    if (authStatus === "authenticated") load();
  }, [authStatus]);

  async function handleWithdraw() {
    setSubmitError(""); setSubmitSuccess("");
    const num = Number(amount);
    if (!num || num < 100) { setSubmitError("Minimum withdrawal is KES 100."); return; }
    if (!phone.trim())     { setSubmitError("M-Pesa phone number is required."); return; }

    // Normalize phone
    const normalized = phone.trim().replace(/^\+/, "").replace(/\s|-/g, "");
    if (!/^(254|0)\d{9}$/.test(normalized)) {
      setSubmitError("Enter a valid Kenyan phone number e.g. 0712345678 or 254712345678.");
      return;
    }
    const finalPhone = normalized.startsWith("0") ? "254" + normalized.slice(1) : normalized;

    setSubmitting(true);
    try {
      const res = await fetch("/api/vending/withdraw", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ amount: num, phone: finalPhone }),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error ?? "Withdrawal failed."); return; }

      setSubmitSuccess(`KES ${num.toLocaleString()} is being sent to your M-Pesa.`);
      setAmount(""); setPhone(""); setShowForm(false);

      const wRes = await fetch("/api/vending/wallet");
      if (wRes.ok) setWallet(await wRes.json());
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || authStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
      </div>
    );
  }

  const balance        = wallet?.balance        ?? 0;
  const totalEarned    = wallet?.totalEarned    ?? 0;
  const totalWithdrawn = wallet?.totalWithdrawn ?? 0;

  return (
    <div className="min-h-screen flex justify-center px-4 py-12">
      <div className="w-full max-w-xl flex flex-col gap-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-purple-400" /> My Wallet
          </h1>
          <p className="text-gray-500 text-sm mt-1">Earnings from ticket sales and vending slot fees.</p>
        </div>

        {/* Balance card */}
        <div className="bg-gradient-to-br from-purple-900/60 to-gray-900 border border-purple-700/40 rounded-2xl p-6 flex flex-col gap-4">
          <p className="text-purple-300 text-xs font-semibold uppercase tracking-widest">Available Balance</p>
          <p className="text-4xl font-bold text-white">
            KES {balance.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-purple-700/30">
            <div>
              <p className="text-purple-400 text-xs">Total Earned</p>
              <p className="text-gray-200 font-semibold">KES {totalEarned.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-purple-400 text-xs">Total Withdrawn</p>
              <p className="text-gray-200 font-semibold">KES {totalWithdrawn.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {submitSuccess && (
          <div className="flex items-center gap-2 bg-green-900/20 border border-green-700/40 rounded-xl px-4 py-3 text-green-400 text-sm">
            <CheckCircle className="w-4 h-4 shrink-0" /> {submitSuccess}
          </div>
        )}

        {/* Withdraw CTA */}
        {!showForm ? (
          <button
            onClick={() => { setShowForm(true); setSubmitError(""); setSubmitSuccess(""); }}
            disabled={balance < 100}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition"
          >
            <ArrowUpRight className="w-4 h-4" />
            {balance < 100 ? "Minimum KES 100 to withdraw" : "Withdraw to M-Pesa"}
          </button>
        ) : (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 className="text-gray-100 font-bold flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-green-400" /> Withdraw to M-Pesa
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-600 hover:text-gray-400 transition">✕</button>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Amount (KES) *</label>
              <input type="number" placeholder="e.g. 5000" value={amount}
                onChange={(e) => setAmount(e.target.value)} className={INPUT} />
              <p className="text-gray-700 text-xs">Available: KES {balance.toLocaleString()} · Min: KES 100</p>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">M-Pesa Phone Number *</label>
              <input type="tel" placeholder="0712 345 678 or 254712345678" value={phone}
                onChange={(e) => setPhone(e.target.value)} className={INPUT} />
              <p className="text-gray-700 text-xs">Kenyan number — funds sent via IntaSend B2C</p>
            </div>

            {submitError && (
              <div className="flex items-start gap-2 bg-red-900/20 border border-red-700/40 rounded-xl px-4 py-3 text-red-300 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {submitError}
              </div>
            )}

            <button onClick={handleWithdraw} disabled={submitting}
              className="w-full py-4 rounded-xl bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-bold text-sm transition flex items-center justify-center gap-2">
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                : <><Smartphone className="w-4 h-4" /> Send KES {Number(amount || 0).toLocaleString()} to M-Pesa</>}
            </button>
          </div>
        )}

        {/* Withdrawal history */}
        {(wallet?.withdrawalRequests.length ?? 0) > 0 && (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
            <button onClick={() => setShowHistory((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-4 text-left">
              <p className="text-gray-300 text-sm font-semibold">Withdrawal History</p>
              {showHistory ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>
            {showHistory && (
              <div className="border-t border-gray-700 divide-y divide-gray-800">
                {wallet!.withdrawalRequests.map((wr) => (
                  <div key={wr.id} className="px-5 py-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-3.5 h-3.5 text-gray-500" />
                        <p className="text-gray-300 text-sm font-semibold">KES {wr.amount.toLocaleString()}</p>
                      </div>
                      <p className="text-gray-600 text-xs mt-0.5">
                        {new Date(wr.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                        {" · M-Pesa"}
                      </p>
                      {wr.failureNote && <p className="text-red-500 text-xs mt-0.5">{wr.failureNote}</p>}
                    </div>
                    <WithdrawalBadge status={wr.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Transaction ledger */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-700">
            <p className="text-gray-300 text-sm font-semibold">Transaction History</p>
            <p className="text-gray-600 text-xs mt-0.5">Last 100 transactions</p>
          </div>
          {(wallet?.transactions.length ?? 0) === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-gray-600 text-sm">No transactions yet.</p>
              <p className="text-gray-700 text-xs mt-1">Earnings appear here after payment is confirmed via IntaSend webhook.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {wallet!.transactions.map((tx) => {
                const { color, prefix } = txTypeStyle(tx.type);
                const isCredit = tx.amount > 0;
                return (
                  <div key={tx.id} className="px-5 py-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCredit ? "bg-green-900/30" : "bg-red-900/20"}`}>
                        {isCredit
                          ? <ArrowDownLeft className="w-4 h-4 text-green-400" />
                          : <ArrowUpRight className="w-4 h-4 text-red-400" />}
                      </div>
                      <div>
                        <p className="text-gray-300 text-sm">{tx.description}</p>
                        <p className="text-gray-600 text-xs">
                          {new Date(tx.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                          {" · "}Balance: KES {tx.balanceAfter.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <p className={`font-bold text-sm shrink-0 ${color}`}>
                      {prefix}KES {Math.abs(tx.amount).toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}