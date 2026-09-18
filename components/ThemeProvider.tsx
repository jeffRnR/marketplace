"use client";

import { createContext, useContext, useEffect, useState } from "react";

type ThemeMode = "system" | "light" | "dark";

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: "light" | "dark";
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = window.localStorage.getItem("noizy-theme") as ThemeMode | null;
    if (stored === "light" || stored === "dark" || stored === "system") setMode(stored);
  }, []);

  useEffect(() => {
    const applyTheme = () => {
      const nextTheme = mode === "system" ? getSystemTheme() : mode;
      setResolvedTheme(nextTheme);
      document.documentElement.dataset.theme = nextTheme;
    };

    applyTheme();
    if (mode !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [mode]);

  const cycleTheme = () => {
    const nextMode: ThemeMode = resolvedTheme === "dark" ? "light" : "dark";
    setMode(nextMode);
    window.localStorage.setItem("noizy-theme", nextMode);
  };

  return (
    <ThemeContext.Provider value={{ mode, resolvedTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}
