// app/marketplace/dashboard/components/types.ts
// Shared types across all dashboard components.

export interface Listing {
  id: string; title: string; description: string; category: string;
  priceType: string; price: number | null; currency: string;
  images: string[]; tags: string[]; isActive: boolean; createdAt: string;
}

export interface Inquiry {
  id: string; senderName: string; senderEmail: string; senderPhone: string | null;
  message: string; status: string; reply: string | null; createdAt: string;
  listing: { id: string; title: string } | null;
}

export interface Booking {
  id: string;
  eventDate: string | null;
  quantity: number;
  notes: string | null;
  totalAmount: number;
  currency: string;
  paymentMethod: string;
  status: string;
  vendorNote: string | null;
  createdAt: string;
  listing: { id: string; title: string };
  conversation: { buyer: { id: string; name: string | null; email: string } };
}

export interface Profile {
  id: string; businessName: string; tagline: string | null;
  description: string; category: string; location: string;
  phone: string; email: string; website: string | null;
  instagram: string | null; coverImage: string | null; logoImage: string | null;
  isVerified: boolean; isActive: boolean; rating: number; reviewCount: number;
  listings: Listing[]; inquiries: Inquiry[];
}

export interface WalletData {
  balance: number; totalEarned: number; totalWithdrawn: number;
  transactions: {
    id: string; type: string; amount: number;
    description: string; balanceAfter: number; createdAt: string;
  }[];
  withdrawalRequests: {
    id: string; amount: number; method: string; status: string;
    failureNote: string | null; createdAt: string;
  }[];
}

export const PRICE_TYPES = ["fixed", "hourly", "daily", "negotiable", "free"];

export const LISTING_CATEGORIES = [
  "Venue","Sound & Lighting","Catering","Bar & Alcohol","DJ Services",
  "Live Music","Photography","Staffing & HR","Decor & Florals",
  "Entertainment","Transport","Logistics","Security","Tech & AV",
  "Print & Branding","Merchandise","Other",
];

export const STATUS_STYLES: Record<string, string> = {
  unread:  "bg-purple-900/30 border-purple-700/50 text-purple-400",
  read:    "bg-gray-800 border-gray-700 text-gray-500",
  replied: "bg-green-900/30 border-green-700/50 text-green-400",
};

export function fmtKES(n: number) {
  return `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function relTime(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

// Image compression — shared by ListingForm and SettingsTab
export async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX = 1200;
      let { width, height } = img;
      if (width > MAX) { height = (height * MAX) / width; width = MAX; }
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => resolve(blob!), "image/webp", 0.8);
    };
    img.src = url;
  });
}