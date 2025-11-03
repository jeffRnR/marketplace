import { CalendarDays, Clock, MapPin, User, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { Category } from "@/data/categories";

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
  category: Category;
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
  const [quantities, setQuantities] = useState<number[]>(tickets.map(() => 0));
  const [errorMessage, setErrorMessage] = useState<string>("");
  const router = useRouter();

  const increase = (idx: number) => {
    setQuantities((prev) =>
      prev.map((q, i) => (i === idx ? Math.min(q + 1, 10) : q))
    );

    setErrorMessage("");
  };

  const decrease = (idx: number) => {
    setQuantities((prev) =>
      prev.map((q, i) => (i === idx ? Math.max(q - 1, 0) : q))
    );
    setErrorMessage("");
  };

  const handleBuy = () => {
    const selectedTickets = tickets
      .map((ticket, idx) => ({
        type: ticket.type,
        price: ticket.price,
        quantity: quantities[idx],
      }))
      .filter((t) => t.quantity > 0);

    if (selectedTickets.length === 0) {
      setErrorMessage(
        "Please select at least one ticket before proceeding to checkout."
      );
      return;
    }

    setErrorMessage("");

    // Create encoded checkout URL
    const checkoutUrl = `/checkout?title=${encodeURIComponent(
      title
    )}&image=${encodeURIComponent(image)}&date=${encodeURIComponent(
      date
    )}&location=${encodeURIComponent(location)}&tickets=${encodeURIComponent(
      JSON.stringify(selectedTickets)
    )}`;

    router.push(checkoutUrl);
  };

  return (
    <div className="w-full overflow-hidden gap-8 flex flex-col lg:flex-row mb-4">
      {/* Left Side */}
      <div className="lg:w-1/2 flex flex-col gap-4">
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

        {/* Host/Info (Desktop) */}
        <div className="hidden lg:flex flex-col gap-4">
          <div className="text-gray-300 text-md flex gap-2 items-center">
            <User className="w-4 h-4 text-[#915f13]" />
            <span className="font-medium">Hosted by {host}</span>
          </div>
          <div className="text-gray-300 text-md flex gap-2 items-center">
            <Users className="w-4 h-4 text-[#915f13]" />
            <span className="font-medium">{attendees} attending</span>
          </div>
          <div className="text-gray-300 text-md border-b pb-4 border-gray-400/20 flex items-center gap-2">
            <category.icon
              className="h-4 w-4"
              style={{ color: category.iconColor }}
            />
            <span className="font-medium">{category.name}</span>
          </div>
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

      {/* Right Side */}
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
            <span className="font-medium">
              {time} - {time}
            </span>
          </div>
        </div>

        {/* Tickets */}
        <div className="my-4 transition-all duration-300">
          <h3 className="text-lg font-bold text-gray-300 mb-2">Tickets</h3>
          <ul className="space-y-4">
            {tickets.map((ticket, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between bg-white/2 px-3 py-2 rounded-2xl border border-gray-400/50"
              >
                <span className="text-md text-gray-300 font-semibold">
                  {ticket.type} - {ticket.price}
                </span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => decrease(idx)}
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-700 text-white hover:bg-gray-600"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-md text-gray-300 font-medium">
                      {quantities[idx]}
                    </span>
                    <button
                      onClick={() => increase(idx)}
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-700 text-white hover:bg-gray-600"
                    >
                      +
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* Buy button at bottom */}
          <button
            onClick={handleBuy}
            className="mt-4 w-full bg-purple-600/50 text-gray-100 font-semibold px-3 py-2 rounded-lg hover:cursor-pointer hover:bg-purple-700 transition"
          >
            Proceed to Checkout
          </button>

          {errorMessage && (
            <p className="text-red-400 text-sm mt-2 text-center font-medium">
              {errorMessage}
            </p>
          )}
        </div>

        <div className="flex flex-col my-4">
          <span className="text-lg mb-2 text-gray-300 font-bold">About</span>
          <p className="text-gray-300 text-md">{description}</p>
        </div>

        <div>
          <iframe
            src={mapUrl}
            className="w-full h-48 rounded-lg border"
            loading="lazy"
          ></iframe>
        </div>

        {/* Info section for mobile */}
        <div className="flex lg:hidden flex-col gap-4 mt-4">
          <div className="text-gray-300 text-md flex gap-2 items-center">
            <User className="w-4 h-4 text-[#915f13]" />
            <span className="font-medium">Hosted by {host}</span>
          </div>
          <div className="text-gray-300 text-md flex gap-2 items-center">
            <Users className="w-4 h-4 text-[#915f13]" />
            <span className="font-medium">{attendees} attending</span>
          </div>
          <div className="text-gray-300 text-md border-b pb-4 border-gray-400/20 flex items-center gap-2">
            <category.icon
              className="h-4 w-4"
              style={{ color: category.iconColor }}
            />
            <span className="font-medium">{category.name}</span>
          </div>
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
