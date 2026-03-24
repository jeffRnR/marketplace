"use client";
// app/marketplace/dashboard/components/BookingsTab.tsx

import { useEffect, useState } from "react";
import { Calendar, Loader2 } from "lucide-react";
import BookingRow from "./BookingRow";
import { Booking } from "./types";

interface Props {
  profileId: string;
}

export default function BookingsTab({ profileId }: Props) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchBookings = async () => {
    try {
      const res = await fetch("/api/marketplace/bookings");
      if (!res.ok) throw new Error("Failed to fetch bookings");
      const data = await res.json();
      setBookings(data.bookings);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleAction = async (bookingId: string, action: string, vendorNote?: string) => {
    try {
      const res = await fetch("/api/marketplace/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, action, vendorNote }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await fetchBookings(); // Refresh bookings
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-2xl">
        <p className="text-red-400 font-semibold">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-gray-200 font-bold mb-4">Booking Requests</h2>
      {bookings.length === 0 ? (
        <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-2xl">
          <Calendar className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 font-semibold">No bookings yet</p>
          <p className="text-gray-600 text-sm mt-1">Booking requests will appear here when customers book your services.</p>
        </div>
      ) : (
        bookings.map(booking => (
          <BookingRow key={booking.id} booking={booking} onAction={handleAction} />
        ))
      )}
    </div>
  );
}