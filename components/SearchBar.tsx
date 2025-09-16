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
      <button onClick={() => setOpen(true)} className="p-2 rounded-full">
        <Search className="transition-all duration-300 w-4 h-4 text-gray-300 hover:text-gray-100" />
      </button>

      {/* Centered dropdown overlay */}
      {open && (
        <div className="fixed left-1/2 top-16 -translate-x-1/2 lg:w-[60%] w-[90%] bg-gradient-to-b border border-gray-400/30 from-[#07000a] to-[#1d0229] rounded-lg shadow-lg z-50">
          <div className="flex items-center bg-transparent p-4 rounded-t-lg border-b border-gray-400/30">
            <Search className="w-4 h-4 text-gray-400 mr-2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search events, categories..."
              className="bg-transparent outline-none flex-1 text-gray-200 placeholder-gray-400"
              autoFocus
            />
            <button
              onClick={() => {
                setOpen(false);
                setQuery("");
              }}
            >
              <X className="transition-all duration-300 w-5 h-5 text-gray-400 hover:text-gray-200 hover:cursor-pointer" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-60 overflow-y-auto scrollbar-hide">
            {results.length > 0 ? (
              results.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleClick(item)}
                  className="flex items-center gap-2 px-4 py-2 hover:border-l-5 hover:pl-6 transition-all duration-300
                  hover:border-gray-400 hover:text-100 cursor-pointer text-sm text-gray-300"
                >
                  {item.type === "event" ? (
                    <Ticket className="w-4 h-4 text-purple-400" />
                  ) : (
                    <Tag className="w-4 h-4 text-blue-400" />
                  )}
                  <span>{item.title}</span>
                </div>
              ))
            ) : (
              <div className="px-4 py-2 text-gray-400 text-sm">
                No results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchBar;
