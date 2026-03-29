"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const ScannerClient = dynamic(
  () => import("./_client"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    ),
  },
);

export default function ScanPage() {
  return <ScannerClient />;
}