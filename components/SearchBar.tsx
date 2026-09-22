"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, X, Tag, Ticket, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface SearchItem {
  type: "event" | "category";
  title: string;
  id: string | number;
}

function SearchBar() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [allData, setAllData] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!open || allData.length > 0) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [eventsRes, categoriesRes] = await Promise.all([
          fetch("/api/events"),
          fetch("/api/categories"),
        ]);
        const [eventsData, categoriesData] = await Promise.all([
          eventsRes.json(),
          categoriesRes.json(),
        ]);
        const combined: SearchItem[] = [
          ...(Array.isArray(eventsData) ? eventsData : []).map(
            (e: { id: string; title: string }) => ({ type: "event" as const, title: e.title, id: e.id })
          ),
          ...(Array.isArray(categoriesData) ? categoriesData : []).map(
            (c: { id: string; name: string }) => ({ type: "category" as const, title: c.name, id: c.id })
          ),
        ];
        setAllData(combined);
      } catch (err) {
        console.error("Search fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [open]);

  const results = query
    ? allData.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()))
    : [];

  const handleClick = (item: SearchItem) => {
    if (item.type === "event") router.push(`/events/${item.id}`);
    else router.push(`/categories/${item.id}`);
    setOpen(false);
    setQuery("");
  };

  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(true)}
        className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-white/5 transition duration-300"
        aria-label="Open search"
      >
        <Search className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div className="w-[90%] max-w-2xl rounded-2xl bg-gray-900 border border-gray-400/20 shadow-2xl overflow-hidden">

            {/* Input */}
            <div className="flex items-center px-4 py-3 border-b border-[var(--brand-purple)]/25">
              {loading
                ? <Loader2 className="w-4 h-4 text-[var(--muted)] mr-3 animate-spin shrink-0" />
                : <Search className="w-4 h-4 text-[var(--muted)] mr-3 shrink-0" />
              }
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search events, categories..."
                className="bg-transparent outline-none flex-1 text-[var(--foreground)] placeholder:text-[var(--muted)] text-sm font-medium"
                autoFocus
              />
              <button
                onClick={handleClose}
                className="text-[var(--muted)] hover:text-[var(--brand-purple)] transition duration-300 ml-2"
                aria-label="Close search"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-64 overflow-y-auto">
              {loading ? (
                <div className="px-4 py-8 text-[var(--muted)] text-center text-sm">
                  Loading...
                </div>
              ) : results.length > 0 ? (
                results.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleClick(item)}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-400/20 last:border-none text-[var(--foreground)] hover:bg-purple-600/10 hover:text-[var(--foreground)] transition duration-200"
                  >
                    {item.type === "event"
                      ? <Ticket className="w-4 h-4 text-[var(--brand-purple)] shrink-0" />
                      : <Tag className="w-4 h-4 text-[var(--brand-green)] shrink-0" />
                    }
                    <span className="font-medium text-sm">{item.title}</span>
                    <span className="ml-auto text-xs text-[var(--muted)] capitalize">{item.type}</span>
                  </div>
                ))
              ) : query ? (
                <div className="px-4 py-8 text-[var(--muted)] text-center text-sm">
                  No results for &ldquo;{query}&rdquo;
                </div>
              ) : (
                <div className="px-4 py-8 text-[var(--muted)] text-center text-sm">
                  Start typing to search events and categories...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchBar;