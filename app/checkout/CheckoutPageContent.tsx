'use client';

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";

interface TicketOption {
  type: string;
  price: string;
  quantity: number;
}

export default function CheckoutPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const title = searchParams.get("title");
  const image = searchParams.get("image");
  const date = searchParams.get("date");
  const location = searchParams.get("location");
  const ticketsJSON = searchParams.get("tickets");

  const [tickets, setTickets] = useState<TicketOption[]>([]);
  const [error, setError] = useState("");

  // Parse tickets data from URL
  useEffect(() => {
    try {
      if (ticketsJSON) {
        const parsed = JSON.parse(ticketsJSON);
        if (Array.isArray(parsed)) {
          setTickets(parsed);
        } else {
          throw new Error("Invalid ticket data");
        }
      } else {
        setError("No ticket data found. Please return to the event page.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load ticket information. Please go back and try again.");
    }
  }, [ticketsJSON]);

  // Calculate total cost
  const total = tickets.reduce(
    (sum, t) => sum + parseFloat(t.price) * t.quantity,
    0
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center mt-14 text-white p-6">
      {error && (
        <div className="bg-red-600 text-white p-3 rounded-lg mb-4 w-full max-w-md text-center">
          {error}
        </div>
      )}

      {!error && (
        <div className="w-full max-w-md bg-gray-900 p-6 rounded-2xl shadow-xl">
          {/* Event Image */}
          {image && (
            <Image
              src={image}
              alt={title || "Event"}
              width={500}
              height={300}
              className="rounded-xl mb-4 object-cover"
            />
          )}

          {/* Event Info */}
          <h1 className="text-2xl font-bold mb-2">{title}</h1>
          <p className="text-gray-400 mb-1">{date}</p>
          <p className="text-gray-400 mb-4">{location}</p>

          {/* Tickets Summary */}
          <h2 className="text-lg font-semibold mb-2">Ticket Summary</h2>
          <div className="space-y-3 mb-4">
            {tickets.map((ticket, index) => (
              <div
                key={index}
                className="flex justify-between items-center border-b border-gray-700 pb-2"
              >
                <div>
                  <p className="font-semibold text-gray-200">{ticket.type}</p>
                  <p className="text-sm text-gray-400">
                    {ticket.quantity} × KES {ticket.price}
                  </p>
                </div>
                <span className="font-semibold text-gray-100">
                  KES {(parseFloat(ticket.price) * ticket.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex justify-between text-xl font-bold border-t border-gray-700 pt-3 mb-6">
            <span>Total</span>
            <span>KES {total.toFixed(2)}</span>
          </div>

          {/* Buttons */}
          <button
            onClick={() => alert("Proceeding to payment...")}
            className="w-full bg-purple-600 hover:bg-purple-700 py-3 rounded-xl font-bold transition"
          >
            Checkout
          </button>

          <button
            onClick={() => router.back()}
            className="w-full mt-3 bg-gray-700 hover:bg-gray-600 py-3 rounded-xl transition"
          >
            Go Back
          </button>
        </div>
      )}
    </div>
  );
}
