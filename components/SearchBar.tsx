"use client";

import React, { useState } from "react";
import { Search, X, Tag, Ticket } from "lucide-react";
import { events } from "@/data/events";
import { categories } from "@/data/categories";
import { useRouter } from "next/navigation";

function SearchBar() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Combine all searchable data
  const allData = [
    ...events.map((e) => ({ type: "event", title: e.title, id: e.id })),
    ...categories.map((c) => ({ type: "category", title: c.name, id: c.id })),
  ];

  // Filter data by search query
  const results = query
    ? allData.filter((item) =>
        item.title.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const handleClick = (item: { type: string; id: string | number }) => {
    if (item.type === "event") {
      router.push(`/events/${item.id}`);
    } else if (item.type === "category") {
      router.push(`/categories/${item.id}`);
    }
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="relative">
      {/* Only show search icon in top bar */}
      <button 
        onClick={() => setOpen(true)} 
        className="p-2 rounded-full hover:bg-gray-200 hover:text-gray-800 transition duration-300"
      >
        <Search className="transition-all duration-300 w-4 h-4 text-gray-300 hover:text-gray-800" />
      </button>

      {/* Centered dropdown overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/50 min-h-screen">
          <div className="lg:w-[60%] w-[70%] max-w-2xl rounded-2xl bg-gray-300 shadow-md z-50">
            <div className="flex items-center p-4 rounded-t-2xl border-b border-gray-400">
              <Search className="w-4 h-4 text-gray-800 mr-3" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search events, categories..."
                className="bg-transparent outline-none flex-1 text-gray-800 placeholder-gray-600 font-bold text-sm"
                autoFocus
              />
              <button
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                }}
                className="text-gray-800 hover:text-purple-800 transition duration-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-60 overflow-y-auto scrollbar-hide rounded-b-2xl">
              {results.length > 0 ? (
                results.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleClick(item)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-purple-800 hover:text-gray-100 
                    transition-all duration-300 cursor-pointer text-gray-800 hover:cursor-pointer border-b border-gray-400 last:border-b-0"
                  >
                    {item.type === "event" ? (
                      <Ticket className="w-5 h-5 text-purple-800" />
                    ) : (
                      <Tag className="w-5 h-5 text-blue-600" />
                    )}
                    <span className="font-medium">{item.title}</span>
                  </div>
                ))
              ) : query ? (
                <div className="px-4 py-6 text-gray-600 text-center text-lg">
                  No results found for "{query}"
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