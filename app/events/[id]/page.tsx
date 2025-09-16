"use client";

import { useParams } from "next/navigation";
import { events } from "@/data/events";
import EventCard from "@/components/EventCard";

export default function EventDetailPage() {
  const params = useParams();
  const eventId = Number(params.id);
  const event = events.find((e) => e.id === eventId);

  if (!event) {
    return (
      <div className="p-10 text-center  text-gray-400">
        <p>Event not found.</p>
        {/* <Link href="/events" className="text-blue-500 underline">
          Back to events
        </Link> */}
      </div>
    );
  }

  return (
    <div className="p-4 lg:w-[70%] min-h-screen mt-14 w-full mx-auto">
      {/* <Link href="/events" className="flex items-center gap-2 text-gray-400 mb-6 hover:text-gray-700">
        <ArrowLeft size={20} /> Back to Events
      </Link> */}

      <EventCard
        image={event.image}
        title={event.title}
        date={event.date}
        time={event.time}
        location={event.location}
        tickets={event.tickets}
        description={event.description}
        mapUrl={event.mapUrl}
        host={event.host}
        attendees={event.attendees}
      />
    </div>
  );
}
