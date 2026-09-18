"use client";
// app/events/_components/CreateEventCTA.tsx

import React from "react";
import Link from "next/link";
import { CalendarPlus, LogIn, ArrowRight } from "lucide-react";

interface Props {
  isAuthenticated: boolean;
  isLoading: boolean;
  isEventOwner: boolean;
  onSignIn: () => void;
}

export default function CreateEventCTA({ isAuthenticated, isLoading, isEventOwner, onSignIn }: Props) {
  // Hide entirely for event owners and while loading
  if (isLoading || isEventOwner) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-[#b9cbbd] bg-white px-5 py-4
                    hover:border-gray-600 transition duration-200">
      <p className="text-[#6d7c75] text-sm">
        {isAuthenticated
          ? "Create your first event"
          : "Sign in to host an event"}
      </p>

      {isAuthenticated ? (
        <Link href="/events/create">
          <button className="flex items-center gap-1.5 text-[#247653] hover:text-[#1d2d28]
                             text-xs font-semibold transition duration-200 whitespace-nowrap">
            <CalendarPlus className="w-3.5 h-3.5" />
            Create Event
            <ArrowRight className="w-3 h-3" />
          </button>
        </Link>
      ) : (
        <button
          onClick={onSignIn}
          className="flex items-center gap-1.5 text-[#247653] hover:text-[#1d2d28]
                     text-xs font-semibold transition duration-200 whitespace-nowrap"
        >
          <LogIn className="w-3.5 h-3.5" />
          Sign In
          <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}