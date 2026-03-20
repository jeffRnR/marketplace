"use client";

import {
  CalendarDays, Clock, MapPin, User, Users,
  Music, Palette, Utensils, Dumbbell, Heart,
  Gift, Cpu, Sparkles, Group, Ticket,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";

const EventsMap = dynamic(() => import("@/components/EventsMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-800 rounded-lg flex items-center justify-center">
      <p className="text-gray-400 text-sm">Loading map...</p>
    </div>
  ),
});

const ICON_MAP: Record<string, React.ElementType> = {
  Music, Palette, Users, Group, Utensils, Dumbbell, Heart, Gift, Cpu, Sparkles,
};

interface TicketOption {
  id:         number;
  type:     string;
  price:    string;
  link:     string;
  isActive?:  boolean;
  startsAt?:  string | null;
  endsAt?:    string | null;
}

interface EventCategory {
  id:        number;
  name:      string;
  iconName:  string;
  iconColor: string;
}

interface EventCardProps {
  eventId:     number;
  createdById: string;
  image:       string;
  title:       string;
  date:        string;
  time:        string;
  location:    string;
  tickets:     TicketOption[];
  description: string;
  mapUrl:      string;
  host:        string;
  attendees:   number;
  category:    EventCategory;
}

// ── Ticket visibility logic (mirrors TicketsPanel) ───────────────────────

function isTicketLive(t: TicketOption): boolean {
  // If the new fields don't exist yet (old data), show everything
  if (t.isActive === undefined) return true;
  if (!t.isActive) return false;
  const now = new Date();
  if (t.startsAt && new Date(t.startsAt) > now) return false; // not started yet
  if (t.endsAt   && new Date(t.endsAt)   < now) return false; // expired
  return true;
}

function getCapacity(link: string): number {
  const m = link?.match(/^capacity:(\d+)$/);
  return m ? parseInt(m[1]) : 0;
}

// ── Component ─────────────────────────────────────────────────────────────

function EventCard({
  eventId, createdById, image, title, date, time,
  location, tickets, description, host, attendees, category,
}: EventCardProps) {
  // Only show tickets that are currently live
  const liveTickets    = tickets.filter(isTicketLive);
  const soldOutTickets = tickets.filter((t) => !isTicketLive(t) && t.isActive === undefined
    ? false
    : !isTicketLive(t) && t.isActive && getCapacity(t.link) === 0
  );
  // Tickets that are inactive/scheduled/expired — hidden completely
  // Tickets that sold out (capacity 0) — shown greyed out

  const [quantities,    setQuantities]    = useState<number[]>(liveTickets.map(() => 0));
  const [errorMessage,  setErrorMessage]  = useState("");
  const router      = useRouter();
  const { data: session } = useSession();

  const CategoryIcon = ICON_MAP[category.iconName] ?? Sparkles;
  const isOwner = !!session?.user && (session.user as any).id === createdById;

  const increase = (idx: number) => {
    setQuantities((prev) => prev.map((q, i) => (i === idx ? Math.min(q + 1, 10) : q)));
    setErrorMessage("");
  };
  const decrease = (idx: number) => {
    setQuantities((prev) => prev.map((q, i) => (i === idx ? Math.max(q - 1, 0) : q)));
    setErrorMessage("");
  };

  const handleBuy = () => {
    const selected = liveTickets
      .map((t, idx) => {
        const isRsvpTicket = t.type === "RSVP" || t.price === " " || t.price === "0";
        return {
          ticketId:   t.id,
          ticketType: t.type,
          price:      t.price,
          quantity:   isRsvpTicket ? 1 : quantities[idx],
        };
      })
      .filter((t) => t.quantity > 0);

    if (selected.length === 0) {
      setErrorMessage("Please select at least one ticket before proceeding to checkout.");
      return;
    }
    setErrorMessage("");
    router.push(
      `/checkout?eventId=${eventId}&title=${encodeURIComponent(title)}&image=${encodeURIComponent(image)}&date=${encodeURIComponent(date)}&location=${encodeURIComponent(location)}&tickets=${encodeURIComponent(JSON.stringify(selected))}`
    );
  };

  const CategoryMeta = () => (
    <>
      <div className="text-gray-300 text-md flex gap-2 items-center">
        <User className="w-4 h-4 text-[#915f13]" />
        <span className="font-medium">Hosted by {host}</span>
      </div>
      <div className="text-gray-300 text-md flex gap-2 items-center">
        <Users className="w-4 h-4 text-[#915f13]" />
        <span className="font-medium">{attendees} attending</span>
      </div>
      <div className="text-gray-300 text-md border-b pb-4 border-gray-400/20 flex items-center gap-2">
        <CategoryIcon className="h-4 w-4" style={{ color: category.iconColor }} />
        <span className="font-medium">{category.name}</span>
      </div>
      <div className="text-gray-400 flex flex-col gap-4 text-sm my-4">
        <Link href="" className="font-medium hover:text-gray-200 transition">Contact Host</Link>
        <Link href="" className="font-medium hover:text-gray-200 transition">Report Event</Link>
      </div>
    </>
  );

  return (
    <div className="w-full overflow-hidden gap-8 flex flex-col lg:flex-row mb-4">

      {/* Left */}
      <div className="lg:w-1/2 flex flex-col gap-4">
        <div className="relative">
          <img src={image} alt={title} className="w-full h-100 object-cover rounded-lg" />
          <span className="absolute bottom-2 font-bold right-2 bg-green-800/50 text-gray-100 px-3 py-1 text-md rounded-full">
            {date} • {time}
          </span>
        </div>
        <div className="hidden lg:flex flex-col gap-4">
          <CategoryMeta />
        </div>
      </div>

      {/* Right */}
      <div className="lg:w-1/2 w-full flex flex-col gap-4">
        <h2 className="text-[2.5rem] font-bold text-gray-100">{title}</h2>

        <div className="text-md text-gray-400 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-red-300" />
          <span className="font-semibold">{location}</span>
        </div>

        <div className="text-gray-400 flex flex-col gap-2">
          <div className="flex gap-2 text-md items-center">
            <CalendarDays className="h-4 w-4" />
            <span className="font-semibold">{date}</span>
          </div>
          <div className="flex text-sm gap-2 items-center">
            <Clock className="h-4 w-4" />
            <span className="font-medium">{time}</span>
          </div>
        </div>

        {/* ── Tickets section ── */}
        <div className="my-4">
          <h3 className="text-lg font-bold text-gray-300 mb-3">Tickets</h3>

          {isOwner ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8 border border-dashed border-gray-600 rounded-xl">
              <span className="text-3xl">🎟</span>
              <p className="text-gray-400 text-sm text-center px-4">
                You created this event and cannot purchase tickets for it.
              </p>
              <Link href={`/my-events`}
                className="mt-1 text-purple-400 hover:text-purple-300 text-sm font-semibold transition">
                Manage Event →
              </Link>
            </div>
          ) : (
            <>
              {/* No tickets available at all */}
              {liveTickets.length === 0 && soldOutTickets.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-8 border border-dashed border-gray-700 rounded-xl text-gray-500">
                  <Ticket className="w-7 h-7 opacity-40" />
                  <p className="text-sm">No tickets available right now.</p>
                </div>
              )}

              {/* Live tickets */}
              {liveTickets.length > 0 && (
                <ul className="space-y-3 mb-4">
                  {liveTickets.map((ticket, idx) => {
                    const isRsvpTicket = ticket.type === "RSVP" || ticket.price === " " || ticket.price === "0";
                    return (
                      <li key={idx}
                        className="flex items-center justify-between bg-white/2 px-3 py-2 rounded-2xl border border-gray-400/50">
                        <span className="text-md text-gray-300 font-semibold">
                          {ticket.type} — {ticket.price}
                        </span>
                        {isRsvpTicket ? (
                          /* RSVP — fixed qty of 1, no controls */
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-purple-400 font-semibold border border-purple-700/50 bg-purple-900/20 px-3 py-1 rounded-lg">
                              1 per person
                            </span>
                          </div>
                        ) : (
                          /* Paid — normal quantity controls */
                          <div className="flex items-center gap-2">
                            <button onClick={() => decrease(idx)}
                              className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-700 text-white hover:bg-gray-600 transition">−</button>
                            <span className="w-6 text-center text-md text-gray-300 font-medium">{quantities[idx]}</span>
                            <button onClick={() => increase(idx)}
                              className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-700 text-white hover:bg-gray-600 transition">+</button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Sold-out tickets — greyed out, no quantity controls */}
              {soldOutTickets.length > 0 && (
                <ul className="space-y-2 mb-4 opacity-50">
                  {soldOutTickets.map((ticket, idx) => (
                    <li key={idx}
                      className="flex items-center justify-between bg-white/2 px-3 py-2 rounded-2xl border border-gray-700">
                      <span className="text-md text-gray-500 font-semibold line-through">
                        {ticket.type} — {ticket.price}
                      </span>
                      <span className="text-xs font-semibold text-red-400 border border-red-800/60 bg-red-900/20 px-2 py-1 rounded-lg">
                        Sold Out
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {liveTickets.length > 0 && (
                <>
                  <button onClick={handleBuy}
                    className="w-full bg-purple-600/50 text-gray-100 font-semibold px-3 py-2 rounded-lg hover:cursor-pointer hover:bg-purple-700 transition">
                    Proceed to Checkout
                  </button>
                  {errorMessage && (
                    <p className="text-red-400 text-sm mt-2 text-center font-medium">{errorMessage}</p>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <div className="flex flex-col my-4">
          <span className="text-lg mb-2 text-gray-300 font-bold">About</span>
          <p className="text-gray-300 text-md">{description}</p>
        </div>

        <div className="w-full h-[250px] rounded-lg overflow-hidden mt-4">
          <EventsMap events={[{ id: title, title, location, date, host }]} />
        </div>

        <div className="flex lg:hidden flex-col gap-4 mt-4">
          <CategoryMeta />
        </div>
      </div>
    </div>
  );
}

export default EventCard;