"use client";
// app/marketplace/[id]/components/ListingsGrid.tsx
// Product-style listing cards with full image gallery per listing.

import { useState } from "react";
import { Tag, MessageSquare, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import ImageGallery from "./ImageGallery";

interface Listing {
  id: string; title: string; description: string; category: string;
  priceType: string; price: number | null; currency: string;
  images: string[]; tags: string[];
}

function PriceLabel({ listing }: { listing: Listing }) {
  if (listing.priceType === "negotiable") return <span className="text-green-400 font-bold text-sm">Negotiable</span>;
  if (listing.priceType === "free")       return <span className="text-green-400 font-bold text-sm">Free</span>;
  if (!listing.price) return null;
  const suffix = listing.priceType==="hourly"?"/hr":listing.priceType==="daily"?"/day":"";
  return <span className="text-green-400 font-bold text-sm">KES {listing.price.toLocaleString()}{suffix}</span>;
}

interface Props {
  listings:    Listing[];
  isOwner:     boolean;
  msgStarting: boolean;
  msgError:    string;
  onMessage:   (listingId: string) => void;
}

function ListingCard({ listing, isOwner, msgStarting, msgError, onMessage }: {
  listing:     Listing;
  isOwner:     boolean;
  msgStarting: boolean;
  msgError:    string;
  onMessage:   (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const shortDesc  = listing.description.length > 120;
  const displayDesc = expanded || !shortDesc
    ? listing.description
    : listing.description.slice(0, 120) + "…";

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition">

      {/* Image gallery */}
      <div className="p-3 pb-0">
        <ImageGallery images={listing.images} title={listing.title} />
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-3">
        {/* Title + price */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-gray-100 font-bold text-base leading-tight">{listing.title}</h3>
          <div className="shrink-0 text-right">
            <PriceLabel listing={listing} />
            {listing.priceType !== "fixed" && listing.priceType !== "free" && listing.priceType !== "negotiable" && (
              <p className="text-gray-600 text-xs">{listing.priceType}</p>
            )}
          </div>
        </div>

        {/* Description with expand */}
        <div>
          <p className="text-gray-400 text-sm leading-relaxed">{displayDesc}</p>
          {shortDesc && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-xs mt-1 transition font-semibold"
            >
              {expanded ? <><ChevronUp className="w-3 h-3"/>Show less</> : <><ChevronDown className="w-3 h-3"/>Show more</>}
            </button>
          )}
        </div>

        {/* Tags */}
        {listing.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {listing.tags.map(tag => (
              <span key={tag} className="flex items-center gap-1 bg-gray-800 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                <Tag className="w-2.5 h-2.5" /> {tag}
              </span>
            ))}
          </div>
        )}

        {/* CTA */}
        {!isOwner && (
          <button
            onClick={() => onMessage(listing.id)}
            disabled={msgStarting}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl text-sm transition"
          >
            {msgStarting
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <MessageSquare className="w-4 h-4" />}
            Message & Book
          </button>
        )}
        {msgError && <p className="text-red-400 text-xs text-center">{msgError}</p>}
      </div>
    </div>
  );
}

export default function ListingsGrid({ listings, isOwner, msgStarting, msgError, onMessage }: Props) {
  if (!listings.length) return null;

  return (
    <div>
      <h2 className="text-gray-200 font-bold text-lg mb-4">Services & Products</h2>
      <div className="grid sm:grid-cols-2 gap-5">
        {listings.map(listing => (
          <ListingCard
            key={listing.id}
            listing={listing}
            isOwner={isOwner}
            msgStarting={msgStarting}
            msgError={msgError}
            onMessage={onMessage}
          />
        ))}
      </div>
    </div>
  );
}