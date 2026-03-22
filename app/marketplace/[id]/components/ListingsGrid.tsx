"use client";
// app/marketplace/[id]/components/ListingsGrid.tsx

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Tag,
  MessageSquare,
  Loader2,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  X,
  Calendar,
  Hash,
  FileText,
  CreditCard,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import ImageGallery from "./ImageGallery";

interface Listing {
  id: string;
  title: string;
  description: string;
  category: string;
  priceType: string;
  price: number | null;
  currency: string;
  images: string[];
  tags: string[];
}

// ─── Price label ──────────────────────────────────────────────────────────────

function PriceLabel({ listing }: { listing: Listing }) {
  if (listing.priceType === "negotiable")
    return <span className="text-green-400 font-bold text-sm">Negotiable</span>;
  if (listing.priceType === "free")
    return <span className="text-green-400 font-bold text-sm">Free</span>;
  if (!listing.price) return null;
  const suffix =
    listing.priceType === "hourly"
      ? "/hr"
      : listing.priceType === "daily"
        ? "/day"
        : "";
  return (
    <span className="text-green-400 font-bold text-sm">
      KES {listing.price.toLocaleString()}
      {suffix}
    </span>
  );
}

// ─── Book Now Modal ───────────────────────────────────────────────────────────
// Creates conversation silently, submits booking, then redirects to /messages

function BookModal({
  listing,
  vendorProfileId,
  onClose,
}: {
  listing: Listing;
  vendorProfileId: string;
  onClose: () => void;
}) {
  const router = useRouter();

  const [eventDate, setEventDate] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [payMethod, setPayMethod] = useState("mpesa");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const totalAmount = (listing.price ?? 0) * Number(quantity || 1);

  async function handleSubmit() {
    setError("");
    setSubmitting(true);
    try {
      // Step 1 — get or create conversation (idempotent)
      const convRes = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorProfileId,
          listingId: listing.id,
          initialMessage: `Hi, I'd like to book "${listing.title}".`,
        }),
      });
      const convData = await convRes.json();
      if (!convRes.ok) {
        setError(convData.error ?? "Could not start conversation");
        return;
      }

      const conversationId = convData.conversation.id;

      // Step 2 — create the booking
      const bookRes = await fetch("/api/marketplace/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          listingId: listing.id,
          eventDate: eventDate || null,
          quantity: Number(quantity),
          notes: notes.trim() || null,
          paymentMethod: payMethod,
        }),
      });
      const bookData = await bookRes.json();
      if (!bookRes.ok) {
        setError(bookData.error ?? "Could not create booking");
        return;
      }

      // Step 3 — redirect to messages with conversation open
      router.push(`/messages?c=${conversationId}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-800">
          <div>
            <h3 className="text-gray-100 font-bold text-base">
              Book this service
            </h3>
            <p className="text-gray-500 text-sm mt-0.5">{listing.title}</p>
            {listing.price && (
              <p className="text-green-400 text-xs font-bold mt-1">
                KES {listing.price.toLocaleString()}
                {listing.priceType !== "fixed" && ` / ${listing.priceType}`}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition mt-0.5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 flex flex-col gap-4">
          {/* Date + Quantity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-gray-400 text-xs mb-1.5 font-semibold">
                <Calendar className="w-3.5 h-3.5" /> Date needed
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-gray-200 text-sm focus:outline-none focus:border-purple-600"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-gray-400 text-xs mb-1.5 font-semibold">
                <Hash className="w-3.5 h-3.5" /> Quantity
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-gray-200 text-sm focus:outline-none focus:border-purple-600"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="flex items-center gap-1.5 text-gray-400 text-xs mb-1.5 font-semibold">
              <FileText className="w-3.5 h-3.5" /> Notes{" "}
              <span className="text-gray-600 font-normal">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe your requirements, event details, number of guests…"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-gray-200 text-sm focus:outline-none focus:border-purple-600 resize-none"
            />
          </div>

          {/* Payment method */}
          <div>
            <label className="flex items-center gap-1.5 text-gray-400 text-xs mb-1.5 font-semibold">
              <CreditCard className="w-3.5 h-3.5" /> Preferred payment
            </label>
            <div className="flex gap-2">
              {[
                { value: "mpesa", label: "M-Pesa" },
                { value: "offline", label: "Pay offline" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPayMethod(opt.value)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition ${
                    payMethod === opt.value
                      ? "bg-purple-600 border-purple-500 text-white"
                      : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Total */}
          {listing.price && (
            <div className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3 border border-gray-700">
              <span className="text-gray-400 text-sm">Total estimate</span>
              <span className="text-white font-bold text-base">
                KES {totalAmount.toLocaleString()}
              </span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 bg-red-900/20 border border-red-700/30 rounded-xl px-3 py-2 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {/* Info note */}
          <p className="text-gray-600 text-xs leading-relaxed">
            Your booking request will be sent to the vendor. Once they approve,
            you can complete payment through the messages page. No charge is
            made now.
          </p>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold py-3 rounded-xl text-sm transition"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShoppingCart className="w-4 h-4" />
            )}
            {submitting ? "Sending request…" : "Send booking request"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Listing card ─────────────────────────────────────────────────────────────

function ListingCard({
  listing,
  isOwner,
  vendorProfileId,
  msgStarting,
  msgError,
  onMessage,
}: {
  listing: Listing;
  isOwner: boolean;
  vendorProfileId: string;
  msgStarting: boolean;
  msgError: string;
  onMessage: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showBook, setShowBook] = useState(false);

  const shortDesc = listing.description.length > 120;
  const displayDesc =
    expanded || !shortDesc
      ? listing.description
      : listing.description.slice(0, 120) + "…";

  const canBook =
    listing.priceType !== "free" && listing.priceType !== "negotiable";

  return (
    <>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition">
        {/* Image gallery */}
        <div className="sm:p-3 sm:pb-0">
          <ImageGallery images={listing.images} title={listing.title} />
        </div>

        {/* Info */}
        <div className="p-4 flex flex-col gap-3">
          {/* Title + price */}
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-gray-100 font-bold text-base leading-tight">
              {listing.title}
            </h3>
            <div className="shrink-0 text-right">
              <PriceLabel listing={listing} />
            </div>
          </div>

          {/* Description */}
          <div>
            <p className="text-gray-400 text-sm leading-relaxed">
              {displayDesc}
            </p>
            {shortDesc && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-xs mt-1 transition font-semibold"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    Show more
                  </>
                )}
              </button>
            )}
          </div>

          {/* Tags */}
          {listing.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {listing.tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 bg-gray-800 text-gray-500 text-xs px-2 py-0.5 rounded-full"
                >
                  <Tag className="w-2.5 h-2.5" /> {tag}
                </span>
              ))}
            </div>
          )}

          {/* CTA buttons */}
          {!isOwner && (
            <div
              className={`grid gap-2 ${canBook ? "grid-cols-2" : "grid-cols-1"}`}
            >
              {/* Message */}
              <button
                onClick={() => onMessage(listing.id)}
                disabled={msgStarting}
                className="flex items-center justify-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-purple-700 disabled:opacity-40 text-gray-300 hover:text-purple-300 font-semibold py-2.5 rounded-xl text-sm transition"
              >
                {msgStarting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <MessageSquare className="w-4 h-4" />
                )}
                Message
              </button>

              {/* Book Now — only for priced listings */}
              {canBook && (
                <button
                  onClick={() => setShowBook(true)}
                  className="flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-xl text-sm transition"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Book Now
                </button>
              )}
            </div>
          )}

          {msgError && (
            <p className="text-red-400 text-xs text-center">{msgError}</p>
          )}
        </div>
      </div>

      {/* Booking modal */}
      {showBook && (
        <BookModal
          listing={listing}
          vendorProfileId={vendorProfileId}
          onClose={() => setShowBook(false)}
        />
      )}
    </>
  );
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

interface Props {
  listings: Listing[];
  isOwner: boolean;
  vendorProfileId: string;
  msgStarting: boolean;
  msgError: string;
  onMessage: (listingId: string) => void;
}

export default function ListingsGrid({
  listings,
  isOwner,
  vendorProfileId,
  msgStarting,
  msgError,
  onMessage,
}: Props) {
  if (!listings.length) return null;

  return (
    <div>
      <h2 className="text-gray-200 font-bold text-lg mb-4">
        Services & Products
      </h2>
      <div className="grid sm:grid-cols-2 gap-5">
        {listings.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            isOwner={isOwner}
            vendorProfileId={vendorProfileId}
            msgStarting={msgStarting}
            msgError={msgError}
            onMessage={onMessage}
          />
        ))}
      </div>
    </div>
  );
}
