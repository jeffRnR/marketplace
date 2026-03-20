"use client";
// app/my-events/components/PromoPanel.tsx

import React, { useState, useEffect } from "react";
import { Tag, Plus, Trash2, Copy, CheckCircle, Zap, Loader2 } from "lucide-react";

interface PromoCode {
  id: string; code: string; discount: string;
  uses: number; maxUses: number; active: boolean;
}

export function PromoPanel({ eventId }: { eventId: number }) {
  const [promos,       setPromos]       = useState<PromoCode[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [newCode,      setNewCode]      = useState("");
  const [newDiscount,  setNewDiscount]  = useState("");
  const [newMax,       setNewMax]       = useState("50");
  const [adding,       setAdding]       = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [copied,       setCopied]       = useState<string | null>(null);
  const [error,        setError]        = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/promos?eventId=${eventId}`);
        if (res.ok) setPromos(await res.json());
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, [eventId]);

  const handleAdd = async () => {
    if (!newCode.trim() || !newDiscount.trim()) { setError("Code and discount are required."); return; }
    setSaving(true); setError("");
    try {
      const res  = await fetch("/api/promos", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ eventId, code: newCode, discount: newDiscount, maxUses: parseInt(newMax) || 50 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPromos((p) => [data, ...p]);
      setNewCode(""); setNewDiscount(""); setNewMax("50"); setAdding(false);
    } catch (err: any) {
      setError(err.message ?? "Failed to create promo code.");
    } finally { setSaving(false); }
  };

  const handleToggle = async (promo: PromoCode) => {
    const prev = promo.active;
    setPromos((p) => p.map((x) => x.id === promo.id ? { ...x, active: !prev } : x));
    try {
      const res = await fetch("/api/promos", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promoId: promo.id, active: !prev }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setPromos((p) => p.map((x) => x.id === promo.id ? { ...x, active: prev } : x));
    }
  };

  const handleDelete = async (id: string) => {
    setPromos((p) => p.filter((x) => x.id !== id));
    try {
      await fetch(`/api/promos?promoId=${id}`, { method: "DELETE" });
    } catch { /* silent — already removed from UI */ }
  };

  const copy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-300 font-bold text-md">Promo Codes</p>
          <p className="text-gray-500 text-sm mt-0.5">{promos.filter(p => p.active).length} active · {promos.length} total</p>
        </div>
        <button onClick={() => { setAdding((v) => !v); setError(""); }}
          className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-gray-100 border border-gray-600 hover:border-gray-400 bg-gray-800 px-3 py-1.5 rounded-lg transition duration-300">
          <Plus className="w-4 h-4" /> New Code
        </button>
      </div>

      {adding && (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 flex flex-col gap-4">
          <p className="text-sm font-semibold text-gray-300">Create a new promo code</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: "Code",     val: newCode,    set: (v: string) => setNewCode(v.toUpperCase()), ph: "SAVE20" },
              { label: "Discount", val: newDiscount, set: setNewDiscount,                            ph: "20% or KES 500" },
              { label: "Max uses", val: newMax,      set: setNewMax,                                 ph: "50" },
            ].map(({ label, val, set, ph }) => (
              <div key={label} className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">{label}</label>
                <input value={val} onChange={(e) => set(e.target.value)} placeholder={ph}
                  className="w-full bg-gray-700 text-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-purple-500 outline-none border border-gray-600 text-sm" />
              </div>
            ))}
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setAdding(false); setError(""); }}
              className="text-sm text-gray-500 hover:text-gray-300 px-3 py-1.5 transition">Cancel</button>
            <button onClick={handleAdd} disabled={saving}
              className="flex items-center gap-2 text-sm font-medium bg-purple-600 hover:bg-purple-700 border border-purple-500 text-white px-4 py-1.5 rounded-lg transition disabled:opacity-50">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Create
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
        </div>
      ) : promos.length === 0 ? (
        <div className="text-center py-12">
          <Tag className="w-8 h-8 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No promo codes yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {promos.map((p) => {
            const pct = Math.min(100, (p.uses / p.maxUses) * 100);
            return (
              <div key={p.id} className={`bg-gray-700/40 border rounded-2xl p-4 transition duration-300 ${
                p.active ? "border-gray-700 hover:border-gray-600" : "border-gray-700/50 opacity-50"
              }`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-purple-900/40 border border-purple-700/40 flex items-center justify-center">
                      <Tag className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-md font-bold text-gray-300 font-mono tracking-wider">{p.code}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        <span className="text-green-400 font-semibold">{p.discount} off</span>
                        {" · "}{p.uses} of {p.maxUses} used
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => copy(p.code)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-700 transition">
                      {copied === p.code ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleToggle(p)}
                      className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition ${
                        p.active ? "bg-green-900/30 border-green-700/50 text-green-400" : "border-gray-600 text-gray-500 hover:border-gray-400"
                      }`}>
                      <Zap className="w-3 h-3" /> {p.active ? "Active" : "Off"}
                    </button>
                    <button onClick={() => handleDelete(p.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:text-red-400 hover:bg-gray-700 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Usage</span><span>{Math.round(pct)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-[3px]">
                    <div className="h-[3px] rounded-full bg-purple-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}