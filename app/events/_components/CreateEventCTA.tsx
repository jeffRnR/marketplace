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
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl
                    border border-dashed border-gray-700 bg-gray-900/40
                    hover:border-gray-600 transition duration-200">
      <p className="text-gray-400 text-xs">
        {isAuthenticated
          ? "Create your first event"
          : "Sign in to host an event"}
      </p>

      {isAuthenticated ? (
        <Link href="/events/create">
          <button className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300
                             text-xs font-semibold transition duration-200 whitespace-nowrap">
            <CalendarPlus className="w-3.5 h-3.5" />
            Create Event
            <ArrowRight className="w-3 h-3" />
          </button>
        </Link>
      ) : (
        <button
          onClick={onSignIn}
          className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300
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