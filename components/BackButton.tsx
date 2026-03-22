"use client";
// app/components/BackButton.tsx
// Floating back button — shows on every page except the home page.
// Uses router.back() to navigate to the previous page in history.
// Hidden on the home page ("/") and when there is no history (first page visited).

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

export default function BackButton() {
  const pathname = usePathname();
  const router   = useRouter();
  const [hasHistory, setHasHistory] = useState(false);

  // Track whether the user has navigated within the app
  useEffect(() => {
    // If they landed directly on this page, history.length is 1 or 2
    // If they navigated from another page, it's higher
    setHasHistory(window.history.length > 1);
  }, [pathname]);

  // Hide on home page
  if (pathname === "/") return null;

  // Hide if no history to go back to
  if (!hasHistory) return null;

  return (
    <button
      onClick={() => router.back()}
      aria-label="Go back"
      className="fixed bottom-8 left-6 z-40
                 w-10 h-10 flex items-center justify-center
                 bg-gray-900 rounded-full
                 text-gray-400 hover:text-white
                 shadow-lg hover:shadow-purple-900/30
                 transition-all duration-200 hover:scale-110"
    >
      <ArrowLeft className="w-4 h-4" />
    </button>
  );
}