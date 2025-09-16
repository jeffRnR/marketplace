export interface TicketOption {
  type: string;
  price: string;
  link: string;
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
  categoryId: number;
}

export const events: Event[] = [
  {
    id: 1,
    image: "/screenshot.png",
    title: "Noizy Nightz: Gothic Party",
    date: "Sept 1, 2025",
    time: "8:00 PM",
    location: "The Garden Venue, Nairobi",
    description: "Step into a gothic-inspired night of music, fashion, and unforgettable vibes.",
    mapUrl: "https://www.google.com/maps/embed?pb=!1m18!...",
    host: "Noizy Nightz",
    attendees: 250,
    tickets: [
      { type: "Early Bird", price: "KES 800", link: "https://tickets.com/noizy-early" },
      { type: "Regular", price: "KES 1200", link: "https://tickets.com/noizy-regular" },
      { type: "VIP", price: "KES 2000", link: "https://tickets.com/noizy-vip" },
    ],
    categoryId: 1,
  },
  {
    id: 2,
    image: "/screenshot.png",
    title: "CineGroove: Outdoor Movie Night",
    date: "Oct 1, 2025",
    time: "7:30 PM",
    location: "Central Park Grounds",
    description: "An outdoor movie night under the stars with drinks, food, and music.",
    mapUrl: "https://www.google.com/maps/embed?pb=!1m18!...",
    host: "CineGroove",
    attendees: 500,
    tickets: [
      { type: "General", price: "KES 500", link: "https://tickets.com/cinegroove" },
    ],
    categoryId: 1,
  },
  {
    id: 3,
    image: "/screenshot.png",
    title: "CineGroove: Outdoor Movie Night 2",
    date: "Oct 1, 2025",
    time: "7:30 PM",
    location: "Central Park Grounds",
    description: "An outdoor movie night under the stars with drinks, food, and music.",
    mapUrl: "https://www.google.com/maps/embed?pb=!1m18!...",
    host: "CineGroove",
    attendees: 500,
    tickets: [
      { type: "General", price: "KES 500", link: "https://tickets.com/cinegroove" },
    ],
    categoryId: 1,
  },
  {
    id: 4,
    image: "/screenshot.png",
    title: "Noizy Nightz: Purple Fest2",
    date: "Nov 10, 2025",
    time: "8:00 PM",
    location: "The Garden Venue, Nairobi",
    description: "Step into a gothic-inspired night of music, fashion, and unforgettable vibes.",
    mapUrl: "https://www.google.com/maps/embed?pb=!1m18!...",
    host: "Noizy Nightz",
    attendees: 250,
    tickets: [
      { type: "Early Bird", price: "KES 1000", link: "https://tickets.com/noizy-early" },
      { type: "Regular", price: "KES 1500", link: "https://tickets.com/noizy-regular" },
      { type: "VIP", price: "KES 3000", link: "https://tickets.com/noizy-vip" },
    ],
    categoryId: 1,
  },
  {
    id: 5,
    image: "/screenshot.png",
    title: "Komm: Hot Festival",
    date: "Dec 15, 2025",
    time: "7:30 PM",
    location: "Central Park Grounds",
    description: "An outdoor movie night under the stars with drinks, food, and music.",
    mapUrl: "https://www.google.com/maps/embed?pb=!1m18!...",
    host: "CineGroove",
    attendees: 500,
    tickets: [
      { type: "General", price: "KES 500", link: "https://tickets.com/cinegroove" },
    ],
    categoryId: 1,
  },
  {
    id: 6,
    image: "/screenshot.png",
    title: "Fire Ent: DJ Fire Live",
    date: "Dec 15, 2025",
    time: "8:00 PM",
    location: "The Garden Venue, Nairobi",
    description: "Step into a gothic-inspired night of music, fashion, and unforgettable vibes.",
    mapUrl: "https://www.google.com/maps/embed?pb=!1m18!...",
    host: "Noizy Nightz",
    attendees: 250,
    tickets: [
      { type: "Early Bird", price: "KES 800", link: "https://tickets.com/noizy-early" },
      { type: "Regular", price: "KES 1200", link: "https://tickets.com/noizy-regular" },
      { type: "VIP", price: "KES 2000", link: "https://tickets.com/noizy-vip" },
    ],
    categoryId: 1,
  },
  {
    id: 7,
    image: "/screenshot.png",
    title: "CineGroove: Outdoor Movie Night 3",
    date: "Nov 1, 2025",
    time: "7:30 PM",
    location: "Central Park Grounds",
    description: "An outdoor movie night under the stars with drinks, food, and music.",
    mapUrl: "https://www.google.com/maps/embed?pb=!1m18!...",
    host: "CineGroove",
    attendees: 500,
    tickets: [
      { type: "General", price: "KES 500", link: "https://tickets.com/cinegroove" },
    ],
    categoryId: 1,
  },
  // more events...
];
