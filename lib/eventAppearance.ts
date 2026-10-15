import type { CSSProperties } from "react";

export const EVENT_PAGE_LAYOUTS = ["classic", "immersive"] as const;
export const EVENT_TICKET_STYLES = ["classic", "minimal"] as const;
export const DEFAULT_EVENT_ACCENT_COLOR = "#7c3aed";
export const DEFAULT_EVENT_TICKET_THEME = "midnight";

export type EventPageLayout = (typeof EVENT_PAGE_LAYOUTS)[number];
export type EventTicketStyle = (typeof EVENT_TICKET_STYLES)[number];

export interface EventTicketThemeColors {
  label: string;
  card: string;
  panel: string;
  panelRaised: string;
  border: string;
  muted: string;
  overlayStart: string;
  overlayEnd: string;
  gradient: string;
  pattern: string;
  patternSize: string;
  font: string;
}

const DOTS = "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)";
const GRID =
  "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)";
const DIAGONAL =
  "repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0 2px, transparent 2px 10px)";

const EVENT_TICKET_THEME_COLORS = {
  midnight: {
    label: "Midnight",
    card: "#111827",
    panel: "#030712",
    panelRaised: "#1f2937",
    border: "#374151",
    muted: "#9ca3af",
    overlayStart: "rgba(17,24,39,0)",
    overlayEnd: "rgba(17,24,39,0.97)",
    gradient: "linear-gradient(160deg, #1f2937 0%, #111827 55%, #0b1220 100%)",
    pattern: DOTS,
    patternSize: "14px 14px",
    font: "system-ui, sans-serif",
  },
  violet: {
    label: "Violet",
    card: "#1b1230",
    panel: "#100a1e",
    panelRaised: "#281b3d",
    border: "#5b3a78",
    muted: "#c4b5d4",
    overlayStart: "rgba(27,18,48,0)",
    overlayEnd: "rgba(27,18,48,0.97)",
    gradient: "linear-gradient(160deg, #2e1d4d 0%, #1b1230 60%, #120a24 100%)",
    pattern: DIAGONAL,
    patternSize: "auto",
    font: "'Trebuchet MS', sans-serif",
  },
  forest: {
    label: "Forest",
    card: "#10251f",
    panel: "#061510",
    panelRaised: "#18352c",
    border: "#286149",
    muted: "#a7c4b4",
    overlayStart: "rgba(16,37,31,0)",
    overlayEnd: "rgba(16,37,31,0.97)",
    gradient: "linear-gradient(160deg, #1c3f33 0%, #10251f 60%, #0a1a15 100%)",
    pattern: GRID,
    patternSize: "20px 20px, 20px 20px",
    font: "Georgia, serif",
  },
  ocean: {
    label: "Ocean",
    card: "#0c2233",
    panel: "#06141f",
    panelRaised: "#12344d",
    border: "#1f5a7d",
    muted: "#9cc3d9",
    overlayStart: "rgba(12,34,51,0)",
    overlayEnd: "rgba(12,34,51,0.97)",
    gradient: "linear-gradient(160deg, #134566 0%, #0c2233 60%, #07151f 100%)",
    pattern: DOTS,
    patternSize: "10px 10px",
    font: "'Gill Sans', 'Trebuchet MS', sans-serif",
  },
  sunset: {
    label: "Sunset",
    card: "#2a1418",
    panel: "#1a0a0d",
    panelRaised: "#3d1f24",
    border: "#7a3b3b",
    muted: "#e0b9a8",
    overlayStart: "rgba(42,20,24,0)",
    overlayEnd: "rgba(42,20,24,0.97)",
    gradient: "linear-gradient(160deg, #5a2a2a 0%, #2a1418 60%, #1a0a0d 100%)",
    pattern: DIAGONAL,
    patternSize: "auto",
    font: "Georgia, serif",
  },
  slate: {
    label: "Slate",
    card: "#18181b",
    panel: "#09090b",
    panelRaised: "#27272a",
    border: "#3f3f46",
    muted: "#a1a1aa",
    overlayStart: "rgba(24,24,27,0)",
    overlayEnd: "rgba(24,24,27,0.97)",
    gradient: "linear-gradient(160deg, #27272a 0%, #18181b 100%)",
    pattern: GRID,
    patternSize: "24px 24px, 24px 24px",
    font: "'Courier New', monospace",
  },
} satisfies Record<string, EventTicketThemeColors>;

export type EventTicketTheme = keyof typeof EVENT_TICKET_THEME_COLORS;
export const EVENT_TICKET_THEMES = Object.keys(EVENT_TICKET_THEME_COLORS) as EventTicketTheme[];

export function isEventPageLayout(value: unknown): value is EventPageLayout {
  return typeof value === "string" && EVENT_PAGE_LAYOUTS.includes(value as EventPageLayout);
}

export function isEventTicketStyle(value: unknown): value is EventTicketStyle {
  return typeof value === "string" && EVENT_TICKET_STYLES.includes(value as EventTicketStyle);
}

export function isEventTicketTheme(value: unknown): value is EventTicketTheme {
  return typeof value === "string" && EVENT_TICKET_THEMES.includes(value as EventTicketTheme);
}

export function safeEventTicketTheme(value: string | null | undefined): EventTicketTheme {
  return value && isEventTicketTheme(value) ? value : DEFAULT_EVENT_TICKET_THEME;
}

export function getEventTicketThemeColors(theme: EventTicketTheme): EventTicketThemeColors {
  return EVENT_TICKET_THEME_COLORS[theme];
}

/** Background, pattern and font for any surface that should wear the theme. */
export function getEventThemeStyle(theme: EventTicketTheme): CSSProperties {
  const t = EVENT_TICKET_THEME_COLORS[theme];
  return {
    backgroundColor: t.card,
    backgroundImage: `${t.pattern}, ${t.gradient}`,
    backgroundSize: `${t.patternSize}, auto`,
    fontFamily: t.font,
  };
}

export function formatEventDate(date: string): string {
  return date
    ? new Date(`${date}T00:00:00`).toLocaleDateString("en-KE", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Event date";
}

export function isEventAccentColor(value: unknown): value is string {
  return typeof value === "string" && /^#[\da-f]{6}$/i.test(value);
}

export function safeEventAccentColor(value: string | null | undefined): string {
  return value && isEventAccentColor(value) ? value : DEFAULT_EVENT_ACCENT_COLOR;
}