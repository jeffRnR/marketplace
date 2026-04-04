"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

function ImportError({ error }: { error: string }) {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#000",
      color: "#fff",
      padding: "32px",
      textAlign: "center",
      gap: "16px",
    }}>
      <p style={{ fontSize: "20px", fontWeight: "900" }}>Failed to load scanner</p>
      <div style={{
        background: "#1a1a1a",
        border: "1px solid #333",
        borderRadius: "12px",
        padding: "16px",
        maxWidth: "360px",
        width: "100%",
        textAlign: "left",
      }}>
        <p style={{ fontSize: "11px", fontFamily: "monospace", color: "#f87171", wordBreak: "break-all" }}>
          {error}
        </p>
      </div>
    </div>
  );
}

export default function ScanPage() {
  const [importError, setImportError] = useState<string | null>(null);
  const [Client, setClient]           = useState<React.ComponentType | null>(null);

  useEffect(() => {
    import("./_client")
      .then(mod => setClient(() => mod.default))
      .catch(err => {
        const msg = err?.message ?? err?.toString() ?? "Unknown import error";
        setImportError(msg);
      });
  }, []);

  if (importError) return <ImportError error={importError} />;

  if (!Client) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
    </div>
  );

  return <Client />;
}