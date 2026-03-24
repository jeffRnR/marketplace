// data/events.ts

export interface TicketOption {
  type: string;
  price: string;
  link: string;
}

export interface EventCategory {
  id: number;
  name: string;
  icon?: string;
  iconColor?: string;
}

export interface Event {
  id: number;
  image: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  mapUrl: string;
  host: string;
  attendees: number;
  tickets: TicketOption[];
  categories: EventCategory[];
  lat?: number;
  lng?: number;
  distance?: number;
  createdById?: string; // for ownership badge
}

export function formatDbEvent(raw: any): Event {
  return {
    id:          raw.id,
    image:       raw.image,
    title:       raw.title,
    date:        new Date(raw.date).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    }),
    time:        raw.time,
    location:    raw.location,
    description: raw.description,
    mapUrl:      raw.mapUrl ?? "",
    host:        raw.host,
    attendees:   raw.attendees ?? 0,
    createdById: raw.createdById ?? raw.createdBy?.id ?? undefined,
    tickets: (raw.tickets ?? []).map((t: any) => ({
      type: t.type, price: t.price, link: t.link,
    })),
    categories: (raw.categories ?? []).map((ec: any) => ec.category ?? ec),
  };
}