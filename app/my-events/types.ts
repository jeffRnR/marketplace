// app/my-events/types.ts

export interface TicketStat {
  id: number;
  type: string;
  price: string;
  capacity: number;
  link: string;
}

export interface EventStats {
  isRsvp: boolean;
  totalCapacity: number;
  ticketRevenue: number;
  isPast: boolean;
  isUpcoming: boolean;
  ticketTypes: number;
  spotsRemaining: number;
  fillRate: number;
}

export interface ManagedEvent {
  id: number;
  title: string;
  image: string;
  date: string;
  rawDate: string;
  time: string;
  location: string;
  description: string;
  host: string;
  attendees: number;
  category: { id: number; name: string; icon?: string; iconColor?: string };
  tickets: TicketStat[];
  stats: EventStats;
}

export interface Summary {
  totalEvents: number;
  upcomingCount: number;
  pastCount: number;
  totalAttendees: number;
  totalRevenue: number;
}

export type Tab = "all" | "upcoming" | "past";
export type DeleteState = "idle" | "confirming" | "deleting";