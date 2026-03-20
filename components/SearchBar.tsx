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

  // Fetch events + categories once when search opens
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
            (e: { id: number; title: string }) => ({
              type: "event" as const,
              title: e.title,
              id: e.id,
            })
          ),
          ...(Array.isArray(categoriesData) ? categoriesData : []).map(
            (c: { id: number; name: string }) => ({
              type: "category" as const,
              title: c.name,
              id: c.id,
            })
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
    ? allData.filter((item) =>
        item.title.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const handleClick = (item: SearchItem) => {
    if (item.type === "event") {
      router.push(`/events/${item.id}`);
    } else {
      router.push(`/categories/${item.id}`);
    }
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
        className="p-2 rounded-full hover:bg-gray-200 hover:text-gray-800 transition duration-300"
      >
        <Search className="transition-all duration-300 w-4 h-4 text-gray-300 hover:text-gray-800" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/50 min-h-screen"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div className="lg:w-[60%] w-[70%] max-w-2xl rounded-2xl bg-gray-300 shadow-md z-50">
            {/* Input */}
            <div className="flex items-center p-4 rounded-t-2xl border-b border-gray-400">
              {loading ? (
                <Loader2 className="w-4 h-4 text-gray-800 mr-3 animate-spin" />
              ) : (
                <Search className="w-4 h-4 text-gray-800 mr-3" />
              )}
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search events, categories..."
                className="bg-transparent outline-none flex-1 text-gray-800 placeholder-gray-600 font-bold text-sm"
                autoFocus
              />
              <button
                onClick={handleClose}
                className="text-gray-800 hover:text-purple-800 transition duration-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-60 overflow-y-auto scrollbar-hide rounded-b-2xl">
              {loading ? (
                <div className="px-4 py-6 text-gray-600 text-center text-sm">
                  Loading...
                </div>
              ) : results.length > 0 ? (
                results.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleClick(item)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-purple-800 hover:text-gray-100
                    transition-all duration-300 cursor-pointer text-gray-800 border-b border-gray-400 last:border-b-0"
                  >
                    {item.type === "event" ? (
                      <Ticket className="w-5 h-5 shrink-0" />
                    ) : (
                      <Tag className="w-5 h-5 shrink-0" />
                    )}
                    <span className="font-medium">{item.title}</span>
                    <span className="ml-auto text-xs opacity-50 capitalize">{item.type}</span>
                  </div>
                ))
              ) : query ? (
                <div className="px-4 py-6 text-gray-600 text-center text-lg">
                  No results for "{query}"
                </div>
              ) : (
                <div className="p-4 text-gray-600 text-center text-sm">
                  Start typing to search events, categories...
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