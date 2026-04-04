"use client";

import { useEffect } from "react";

export default function ScanError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Scanner error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center bg-gray-950">
      <div className="w-16 h-16 rounded-full bg-red-900/30 border border-red-700/50 flex items-center justify-center">
        <span className="text-red-400 text-2xl font-black">!</span>
      </div>
      <div className="w-full max-w-sm">
        <p className="text-white font-black text-xl mb-2">Scanner error</p>
        <p className="text-gray-400 text-sm mb-4">
          Screenshot this and send to support
        </p>
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-left space-y-2">
          <p className="text-gray-500 text-xs font-mono">message:</p>
          <p className="text-red-400 text-xs font-mono break-all">
            {error?.message || "none"}
          </p>
          <p className="text-gray-500 text-xs font-mono mt-2">name:</p>
          <p className="text-amber-400 text-xs font-mono break-all">
            {error?.name || "none"}
          </p>
          <p className="text-gray-500 text-xs font-mono mt-2">stack:</p>
          <p className="text-gray-400 text-xs font-mono break-all whitespace-pre-wrap">
            {error?.stack?.slice(0, 500) || "none"}
          </p>
          {error?.digest && (
            <>
              <p className="text-gray-500 text-xs font-mono mt-2">digest:</p>
              <p className="text-gray-400 text-xs font-mono break-all">
                {error.digest}
              </p>
            </>
          )}
        </div>
      </div>
      <button
        onClick={reset}
        className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-xl transition text-sm"
      >
        Try again
      </button>
    </div>
  );
}