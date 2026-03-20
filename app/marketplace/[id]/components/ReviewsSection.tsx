"use client";
// app/marketplace/[id]/components/ReviewsSection.tsx

import { useState } from "react";
import { Star, CheckCircle, Loader2 } from "lucide-react";

interface Review {
  id: string; reviewerName: string; rating: number;
  comment: string | null; createdAt: string;
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`w-4 h-4 ${i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-gray-700"}`} />
      ))}
    </div>
  );
}

function ReviewForm({ profileId, onDone }: { profileId: string; onDone: () => void }) {
  const [open,   setOpen]   = useState(false);
  const [rating, setRating] = useState(0);
  const [hover,  setHover]  = useState(0);
  const [form,   setForm]   = useState({ reviewerName: "", reviewerEmail: "", comment: "" });
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    await fetch("/api/marketplace/reviews", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId, ...form, rating }),
    });
    setSaving(false); setDone(true);
    setTimeout(() => { setOpen(false); onDone(); }, 1500);
  };

  if (!open) return (
    <button onClick={() => setOpen(true)} className="flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-semibold transition">
      <Star className="w-4 h-4" /> Leave a Review
    </button>
  );

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-5 space-y-4 mt-4">
      <h4 className="text-gray-200 font-semibold">Leave a Review</h4>
      {done ? (
        <div className="flex items-center gap-2 text-green-400">
          <CheckCircle className="w-5 h-5" /> Submitted, thank you!
        </div>
      ) : (
        <>
          <div className="flex gap-1">
            {[1,2,3,4,5].map(i => (
              <button key={i} onClick={() => setRating(i)} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)}>
                <Star className={`w-7 h-7 transition-colors ${i<=(hover||rating)?"fill-amber-400 text-amber-400":"text-gray-700"}`} />
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-400 text-xs mb-1">Your Name *</label>
              <input value={form.reviewerName} onChange={e => setForm(f => ({...f, reviewerName: e.target.value}))}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-purple-600" />
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">Email *</label>
              <input value={form.reviewerEmail} onChange={e => setForm(f => ({...f, reviewerEmail: e.target.value}))}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-purple-600" />
            </div>
          </div>
          <div>
            <label className="block text-gray-400 text-xs mb-1">Comment</label>
            <textarea value={form.comment} onChange={e => setForm(f => ({...f, comment: e.target.value}))} rows={3}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-purple-600 resize-none" />
          </div>
          <div className="flex gap-3">
            <button onClick={handleSubmit} disabled={saving || !rating || !form.reviewerName.trim() || !form.reviewerEmail.trim()}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-semibold px-4 py-2 rounded-lg text-sm transition">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              Submit
            </button>
            <button onClick={() => setOpen(false)} className="text-gray-500 text-sm hover:text-gray-300 transition">Cancel</button>
          </div>
        </>
      )}
    </div>
  );
}

interface Props {
  reviews:   Review[];
  profileId: string;
  isOwner:   boolean;
  onRefresh: () => void;
}

export default function ReviewsSection({ reviews, profileId, isOwner, onRefresh }: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-gray-200 font-bold text-lg">Reviews</h2>
        {!isOwner && <ReviewForm profileId={profileId} onDone={onRefresh} />}
      </div>

      {reviews.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
          <p className="text-gray-500 text-sm">No reviews yet — be the first!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-gray-300 text-sm font-semibold">{r.reviewerName}</p>
                  <p className="text-gray-600 text-xs">{new Date(r.createdAt).toLocaleDateString("en-KE", { day:"numeric", month:"short", year:"numeric" })}</p>
                </div>
                <Stars rating={r.rating} />
              </div>
              {r.comment && <p className="text-gray-400 text-sm leading-relaxed">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}