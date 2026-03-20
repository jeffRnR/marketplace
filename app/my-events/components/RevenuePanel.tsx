"use client";
// app/my-events/components/RevenuePanel.tsx

import React, { useState } from "react";
import { Send, CheckCircle, Mail } from "lucide-react";
import { ManagedEvent } from "../types";

export function RevenuePanel({ event }: { event: ManagedEvent }) {
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const paidTickets = event.tickets.filter((t) => t.type !== "RSVP");
  const gross = paidTickets.reduce((s, t) => {
    const price = parseFloat(t.price.replace(/[^0-9.]/g, "")) || 0;
    return s + price * t.capacity;
  }, 0);
  const commission = gross * 0.05;
  const net = gross - commission;

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSent(true); setSending(false); setMessage("");
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <div className="flex flex-col gap-6">

      {event.stats.isRsvp ? (
        <div className="bg-gray-700/40 border border-gray-700 rounded-lg px-4 py-4">
          <p className="text-gray-300 font-semibold text-sm">Free RSVP Event</p>
          <p className="text-gray-500 text-sm mt-1">No ticket revenue — attendees join for free.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Revenue summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Gross revenue",  value: `KES ${gross.toLocaleString()}`,       color: "text-gray-300",  note: "Before fees" },
              { label: "Platform fee",   value: `KES ${commission.toLocaleString()}`,  color: "text-gray-500",  note: "5% commission" },
              { label: "Your earnings",  value: `KES ${net.toLocaleString()}`,          color: "text-green-400", note: "Net payout" },
            ].map(({ label, value, color, note }) => (
              <div key={label} className="bg-gray-700/40 border border-gray-700 rounded-lg p-3">
                <p className={`text-md font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-400 mt-1">{label}</p>
                <p className="text-xs text-gray-600 mt-0.5">{note}</p>
              </div>
            ))}
          </div>

          {/* Per-ticket breakdown */}
          <div className="flex flex-col gap-2">
            <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">Breakdown by ticket</p>
            {paidTickets.map((t) => {
              const price = parseFloat(t.price.replace(/[^0-9.]/g, "")) || 0;
              const rev = price * t.capacity;
              const ticketNet = rev * 0.95;
              const pct = gross > 0 ? (rev / gross) * 100 : 0;
              return (
                <div key={t.id} className="bg-gray-700/40 border border-gray-700 rounded-lg px-4 py-3">
                  <div className="flex justify-between items-start mb-2.5">
                    <div>
                      <p className="text-sm font-semibold text-gray-300">{t.type}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{t.capacity} tickets · {t.price} each</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-400">KES {ticketNet.toLocaleString()}</p>
                      <p className="text-xs text-gray-600">net revenue</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-[3px]">
                    <div className="h-[3px] bg-purple-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{Math.round(pct)}% of total gross</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="border-t border-gray-700" />

      {/* Message attendees */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gray-700 border border-gray-600 flex items-center justify-center">
            <Mail className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-300">Message Attendees</p>
            <p className="text-xs text-gray-500">Send an update to all {event.attendees} people attending</p>
          </div>
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`Hey everyone! A quick update about "${event.title}"...`}
          rows={4}
          className="w-full bg-gray-800 text-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none border border-gray-700 text-sm resize-none"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-600">{message.length} characters · {event.attendees} recipient{event.attendees !== 1 ? "s" : ""}</p>
          <button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg border transition duration-300 ${
              sent
                ? "bg-green-900/30 border-green-700/50 text-green-400"
                : "bg-purple-600/40 hover:bg-purple-600 border-purple-600/60 hover:border-purple-500 text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
            }`}
          >
            {sent ? <><CheckCircle className="w-4 h-4" /> Sent!</> :
             sending ? "Sending..." :
             <><Send className="w-4 h-4" /> Send message</>}
          </button>
        </div>
      </div>
    </div>
  );
}