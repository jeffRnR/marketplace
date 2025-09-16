import { CalendarDays, Clock, MapPin, Tag, User, Users } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";

interface TicketOption {
  type: string;
  price: string;
  link: string;
}

interface EventCardProps {
  image: string;
  title: string;
  date: string;
  time: string;
  location: string;
  tickets: TicketOption[];
  description: string;
  mapUrl: string;
  host: string;
  attendees: number;
  category: string;
}

function EventCard({
  image,
  title,
  date,
  time,
  location,
  tickets,
  description,
  mapUrl,
  host,
  attendees,
  category,
}: EventCardProps) {
  return (
    <div className="w-full overflow-hidden gap-8 flex flex-col lg:flex-row mb-4">
      {/* Left Side - Desktop Layout */}
      <div className="lg:w-1/2 flex flex-col gap-4">
        {/* Event Poster */}
        <div className="relative">
          <img
            src={image}
            alt={title}
            className="w-full h-100 object-cover rounded-lg"
          />
          <span className="absolute bottom-2 font-bold right-2 bg-green-800/50 text-gray-100 px-3 py-1 text-md rounded-full">
            {date} • {time}
          </span>
        </div>

        {/* Info (host, attendees, category, links) - Hidden on mobile, shown on desktop */}
        <div className="hidden lg:flex flex-col gap-4">
          {/* Host */}
          <div className="text-gray-300 text-md flex gap-2 items-center">
            <User className="w-4 h-4 text-[#915f13]" />
            <span className="font-medium">Hosted by {host}</span>
          </div>
          {/* Attendees */}
          <div className="text-gray-300 text-md flex gap-2 items-center">
            <Users className="w-4 h-4 text-[#915f13]" />
            <span className="font-medium">{attendees} attending</span>
          </div>
          {/* Category */}
          <div className="text-gray-300 text-md border-b pb-4 border-gray-400/20 flex items-center gap-2">
            <Tag className="h-4 w-4 text-green-500" />
            <span className="font-medium">{category}</span>
          </div>
          {/* Contact / Report */}
          <div className="text-gray-400 flex flex-col gap-4 text-sm my-4">
            <Link href="">
              <span className="font-medium">Contact Host</span>
            </Link>
            <Link href="">
              <span className="font-medium">Report Event</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Right Side - Main Content */}
      <div className="lg:w-1/2 w-full flex flex-col gap-4">
        {/* Title */}
        <h2 className="text-[2.5rem] font-bold text-gray-100">{title}</h2>

        {/* Location */}
        <div className="text-md text-gray-400 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-red-300" />
          <span className="font-semibold">{location}</span>
        </div>

        {/* Date time */}
        <div className="text-gray-400 flex flex-col gap-2">
          <div className="flex gap-2 text-md items-center">
            <CalendarDays className="h-4 w-4" />
            <span className="font-semibold">{date}</span>
          </div>
          <div className="flex text-sm gap-2 items-center">
            <Clock className="h-4 w-4" />
            <span className="font-medium">
              {time} - {time}
            </span>
          </div>
        </div>

        {/* Tickets */}
        <div className="my-4">
          <h3 className="text-lg font-bold text-gray-300 mb-2">Tickets</h3>
          <ul className="space-y-4">
            {tickets.map((ticket, idx) => {
              const [quantity, setQuantity] = useState(0);

              const increase = () => setQuantity((q) => Math.min(q + 1, 10)); // max 10
              const decrease = () => setQuantity((q) => Math.max(q - 1, 0)); // min 0

              return (
                <li
                  key={idx}
                  className="flex items-center justify-between bg-white/2 px-3 py-2 rounded-2xl border border-gray-400/50"
                >
                  {/* Ticket type & price */}
                  <span className="text-md text-gray-300 font-semibold">
                    {ticket.type} - {ticket.price}
                  </span>

                  {/* Quantity + Buy button */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={decrease}
                        className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-700 text-white hover:bg-gray-600"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-md text-gray-300 font-medium">
                        {quantity}
                      </span>
                      <button
                        onClick={increase}
                        className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-700 text-white hover:bg-gray-600"
                      >
                        +
                      </button>
                    </div>
                    <a
                      href={`${ticket.link}?quantity=${quantity}`}
                      className="bg-purple-600/50 text-gray-300 px-3 py-1 rounded-lg text-sm hover:bg-blue-700 transition"
                    >
                      Buy
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Description */}
        <div className="flex flex-col my-4">
          <span className="text-lg mb-2 text-gray-300 font-bold">About</span>
          <p className="text-gray-300 text-md">{description}</p>
        </div>

        {/* Map */}
        <div>
          <iframe
            src={mapUrl}
            className="w-full h-48 rounded-lg border"
            loading="lazy"
          ></iframe>
        </div>

        {/* Info section for mobile - shown only on small screens at the bottom */}
        <div className="flex lg:hidden flex-col gap-4 mt-4">
          {/* Host */}
          <div className="text-gray-300 text-md flex gap-2 items-center">
            <User className="w-4 h-4 text-[#915f13]" />
            <span className="font-medium">Hosted by {host}</span>
          </div>
          {/* Attendees */}
          <div className="text-gray-300 text-md flex gap-2 items-center">
            <Users className="w-4 h-4 text-[#915f13]" />
            <span className="font-medium">{attendees} attending</span>
          </div>
          {/* Category */}
          <div className="text-gray-300 text-md border-b pb-4 border-gray-400/20 flex items-center gap-2">
            <Tag className="h-4 w-4 text-green-500" />
            <span className="font-medium">{category}</span>
          </div>
          {/* Contact / Report */}
          <div className="text-gray-400 flex flex-col gap-4 text-sm my-4">
            <Link href="">
              <span className="font-medium">Contact Host</span>
            </Link>
            <Link href="">
              <span className="font-medium">Report Event</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventCard;
