"use client";
// app/marketplace/dashboard/components/BookingRow.tsx

import { useState } from "react";
import { ChevronDown, ChevronUp, Phone, Loader2, Calendar, DollarSign, User } from "lucide-react";
import { Booking } from "./types";

interface Props {
  booking: Booking;
  onAction: (bookingId: string, action: string, vendorNote?: string) => void;
}

export default function BookingRow({ booking, onAction }: Props) {
  const [open, setOpen] = useState(false);
  const [vendorNote, setVendorNote] = useState(booking.vendorNote ?? "");
  const [saving, setSaving] = useState(false);

  const handleAction = async (action: string) => {
    setSaving(true);
    await onAction(booking.id, action, vendorNote);
    setSaving(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-900/30 border-yellow-700/50 text-yellow-400";
      case "approved": return "bg-blue-900/30 border-blue-700/50 text-blue-400";
      case "confirmed": return "bg-green-900/30 border-green-700/50 text-green-400";
      case "cancelled": return "bg-red-900/30 border-red-700/50 text-red-400";
      default: return "bg-gray-800 border-gray-700 text-gray-500";
    }
  };

  return (
    <div className={`border rounded-xl overflow-hidden ${open ? "border-purple-700/40" : "border-gray-800"}`}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-800/40 transition">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-2 h-2 rounded-full shrink-0 ${
            booking.status === "pending" ? "bg-yellow-400"
            : booking.status === "approved" ? "bg-blue-400"
            : booking.status === "confirmed" ? "bg-green-400"
            : "bg-gray-600"
          }`} />
          <div className="min-w-0">
            <p className="text-gray-200 text-sm font-semibold truncate">
              {booking.conversation.buyer.name || booking.conversation.buyer.email}
            </p>
            <p className="text-gray-500 text-xs truncate">
              {booking.listing.title}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(booking.status)}`}>
            {booking.status}
          </span>
          {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-gray-800 pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-gray-400">Buyer:</span>
              <span className="text-gray-200">{booking.conversation.buyer.name || "N/A"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-gray-400">Event Date:</span>
              <span className="text-gray-200">
                {booking.eventDate ? new Date(booking.eventDate).toLocaleDateString() : "N/A"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <span className="text-gray-400">Amount:</span>
              <span className="text-gray-200">
                {booking.currency} {booking.totalAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Quantity:</span>
              <span className="text-gray-200">{booking.quantity}</span>
            </div>
          </div>

          {booking.notes && (
            <div>
              <span className="text-gray-400 text-sm">Notes:</span>
              <p className="text-gray-200 text-sm mt-1">{booking.notes}</p>
            </div>
          )}

          {booking.status === "pending" && (
            <div className="space-y-3">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Vendor Note (optional)</label>
                <textarea
                  value={vendorNote}
                  onChange={(e) => setVendorNote(e.target.value)}
                  placeholder="Add a note for the buyer..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm resize-none"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAction("approve")}
                  disabled={saving}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-green-600/50 text-white font-semibold px-4 py-2 rounded-lg text-sm transition"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Approve
                </button>
                <button
                  onClick={() => handleAction("reject")}
                  disabled={saving}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:bg-red-600/50 text-white font-semibold px-4 py-2 rounded-lg text-sm transition"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Reject
                </button>
              </div>
            </div>
          )}

          {booking.status === "approved" && booking.paymentMethod === "offline" && (
            <div className="flex gap-2">
              <button
                onClick={() => handleAction("confirm_offline")}
                disabled={saving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-semibold px-4 py-2 rounded-lg text-sm transition"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Mark as Paid
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}