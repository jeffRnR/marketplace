"use client";
// app/marketplace/dashboard/components/InquiryRow.tsx

import { useState } from "react";
import { ChevronDown, ChevronUp, Phone, Loader2, MessageSquare } from "lucide-react";
import { Inquiry, STATUS_STYLES } from "./types";

interface Props {
  inquiry: Inquiry;
  onReply: (id: string, reply: string) => void;
}

export default function InquiryRow({ inquiry, onReply }: Props) {
  const [open,   setOpen]   = useState(false);
  const [reply,  setReply]  = useState(inquiry.reply ?? "");
  const [saving, setSaving] = useState(false);

  const handleReply = async () => {
    setSaving(true);
    await onReply(inquiry.id, reply);
    setSaving(false);
  };

  return (
    <div className={`border rounded-xl overflow-hidden ${open ? "border-purple-700/40" : "border-gray-800"}`}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-800/40 transition">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-2 h-2 rounded-full shrink-0 ${
            inquiry.status === "unread" ? "bg-purple-400"
            : inquiry.status === "replied" ? "bg-green-400"
            : "bg-gray-600"
          }`} />
          <div className="min-w-0">
            <p className="text-gray-200 text-sm font-semibold truncate">{inquiry.senderName}</p>
            <p className="text-gray-500 text-xs truncate">
              {inquiry.senderEmail}{inquiry.listing && ` · re: ${inquiry.listing.title}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_STYLES[inquiry.status] ?? ""}`}>
            {inquiry.status}
          </span>
          {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-gray-800 pt-4 space-y-4">
          {inquiry.senderPhone && (
            <p className="text-gray-500 text-xs flex items-center gap-1">
              <Phone className="w-3 h-3" />{inquiry.senderPhone}
            </p>
          )}
          <div className="bg-gray-800 rounded-xl p-3">
            <p className="text-gray-300 text-sm">{inquiry.message}</p>
          </div>
          {inquiry.reply && (
            <div className="bg-purple-900/20 border border-purple-700/30 rounded-xl p-3">
              <p className="text-purple-400 text-xs font-semibold mb-1">Your reply</p>
              <p className="text-gray-300 text-sm">{inquiry.reply}</p>
            </div>
          )}
          <div>
            <textarea value={reply} onChange={e => setReply(e.target.value)} rows={2}
              placeholder="Reply to this inquiry…"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-purple-600 resize-none mb-2" />
            <button onClick={handleReply} disabled={saving || !reply.trim()}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-semibold px-4 py-2 rounded-lg text-sm transition">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
              Send Reply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}