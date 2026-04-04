"use client";

export default function ScanPage() {
  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      backgroundColor: "#000",
      color: "#fff",
      flexDirection: "column",
      gap: "16px",
      padding: "32px",
      textAlign: "center"
    }}>
      <p style={{ fontSize: "24px", fontWeight: "900" }}>Scanner test</p>
      <p style={{ fontSize: "14px", color: "#9ca3af" }}>
        If you see this, the page loads correctly.
      </p>
    </div>
  );
}