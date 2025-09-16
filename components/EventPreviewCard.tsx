import { CalendarDays, Clock, MapPin } from "lucide-react";
import React from "react";

interface EventPreviewCardProps {
  image: string;
  title: string;
  date: string;
  time: string;
  location: string;
  variant?: "allEvents"; // 👈 only one variant
}

function EventPreviewCard({
  image,
  title,
  date,
  time,
  location,
  variant, // 👈 no default fallback needed
}: EventPreviewCardProps) {
  return (
    <div
      className={`shadow-md flex items-center overflow-hidden hover:shadow-lg transition ${
        variant === "allEvents" ? "flex-col items-start" : ""
      }`}
    >
      {/* Event Image */}
      <img
        src={image}
        alt={title}
        className={`rounded-xl shadow-md shadow-gray-800/20 object-cover ${
          variant === "allEvents"
            ? "w-full h-80 mb-3" // bigger image for allEvents
            : "w-30 h-30"
        }`}
      />

      {/* Event Info */}
      <div className={`${variant === "allEvents" ? "p-2 space-y-1 mb-4 " : "p-3 space-y-1"}`}>
        <h2
          className={`font-bold text-gray-300 ${
            variant === "allEvents" ? "text-[1.5rem]" : "text-[1.3rem]"
          }`}
        >
          {title}
        </h2>

        <span className="text-gray-400 flex items-center gap-2 text-md">
          <CalendarDays className="h-4 w-4" />
          {date}
        </span>

        <span className="text-gray-400 flex items-center gap-2 text-md">
          <Clock className="h-4 w-4" />
          {time} - {time}
        </span>

        <p
          className={`text-gray-400 flex items-center gap-2 ${
            variant === "allEvents" ? "text-sm" : "text-md"
          }`}
        >
          <MapPin className="h-4 w-4" />
          {location}
        </p>
      </div>
    </div>
  );
}

export default EventPreviewCard;
