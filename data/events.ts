// data/events.ts
// This file is now a type definition only.
// All event data comes from the database via /api/events.
// Delete the dummy array — components should fetch directly.

export interface TicketOption {
  type: string;
  price: string;
  link: string;
}

export interface Event {
  id: number;
  image: string;
  title: string;
  date: string;        // formatted string e.g. "Mar 21, 2026"
  time: string;
  location: string;
  description: string;
  mapUrl: string;
  host: string;
  attendees: number;
  tickets: TicketOption[];
  categoryId: number;
  category?: { id: number; name: string; icon?: string };
  lat?: number;
  lng?: number;
  distance?: number;
}

// Helper — format a DB event (raw DateTime) into the Event interface shape
export function formatDbEvent(raw: any): Event {
  return {
    id: raw.id,
    image: raw.image,
    title: raw.title,
    date: new Date(raw.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: raw.time,
    location: raw.location,
    description: raw.description,
    mapUrl: raw.mapUrl ?? "",
    host: raw.host,
    attendees: raw.attendees ?? 0,
    tickets: (raw.tickets ?? []).map((t: any) => ({
      type: t.type,
      price: t.price,
      link: t.link,
    })),
    categoryId: raw.categoryId,
    category: raw.category,
  };
}