// app/components/EventPreviewCard.tsx

import { CalendarDays, Clock, MapPin } from "lucide-react";
import React from "react";

interface EventPreviewCardProps {
  image:    string;
  title:    string;
  date:     string;
  time:     string;
  location: string;
  variant?: "allEvents";
  isOwner?: boolean; // shows "Your Event" badge when true
}

function EventPreviewCard({
  image, title, date, time, location, variant, isOwner,
}: EventPreviewCardProps) {
  const isAllEvents = variant === "allEvents";

  return (
    <div className={`
      flex overflow-hidden hover:shadow-lg transition duration-300 h-full
      ${isAllEvents ? "flex-col" : "flex-row items-center gap-3"}
    `}>
      {/* Image */}
      <div className={`
        shrink-0 overflow-hidden rounded-xl relative
        ${isAllEvents ? "w-full aspect-video" : "w-28 h-28"}
      `}>
        <img src={image} alt={title} className="w-full h-full object-cover" />
        {/* Badge on image */}
        {isOwner && (
          <span className="absolute top-2 left-2 text-xs font-bold text-green-400 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full border border-green-400/40">
            Your Event
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col justify-between flex-1 min-w-0 p-2 gap-1">
        <div className="flex items-start justify-between gap-2">
          <h2 className={`
            font-bold text-gray-300 leading-snug line-clamp-2
            ${isAllEvents ? "text-xl" : "text-base"}
          `}>
            {title}
          </h2>
          {/* Badge inline for non-allEvents variant */}
          {isOwner && !isAllEvents && (
            <span className="shrink-0 text-xs font-bold text-green-400 bg-green-400/30 px-2 py-0.5 rounded-full">
              Your Event
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1 mt-1">
          <span className="text-gray-400 flex items-center gap-2 text-sm truncate">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{date}</span>
          </span>
          <span className="text-gray-400 flex items-center gap-2 text-sm truncate">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{time}</span>
          </span>
          <span className="text-gray-400 flex items-center gap-2 text-sm truncate">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{location}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default EventPreviewCard;