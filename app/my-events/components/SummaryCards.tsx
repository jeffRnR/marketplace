"use client";
// app/my-events/components/SummaryCards.tsx

import React from "react";
import { Summary } from "../types";
import { Calendar, Clock, History, Users, Banknote } from "lucide-react";

export function SummaryCards({ summary }: { summary: Summary }) {
  const cards = [
    {
      label: "Events created",
      value: summary.totalEvents,
      icon: Calendar,
      iconColor: "text-purple-400",
      bg: "bg-purple-900/20",
    },
    {
      label: "Upcoming events",
      value: summary.upcomingCount,
      icon: Clock,
      iconColor: "text-green-400",
      bg: "bg-green-900/20",
    },
    {
      label: "Past events",
      value: summary.pastCount,
      icon: History,
      iconColor: "text-gray-400",
      bg: "bg-gray-700/40",
    },
    {
      label: "Total attendees",
      value: summary.totalAttendees.toLocaleString(),
      icon: Users,
      iconColor: "text-orange-400",
      bg: "bg-orange-900/20",
    },
    {
      label: "Est. revenue",
      value: `KES ${summary.totalRevenue.toLocaleString()}`,
      icon: Banknote,
      iconColor: "text-blue-400",
      bg: "bg-blue-900/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map(({ label, value, icon: Icon, iconColor, bg }) => (
        <div
          key={label}
          className="shadow-md shadow-black bg-gray-800 border border-gray-700 hover:border-gray-600 hover:-translate-y-1 rounded-2xl p-4 transition duration-300"
        >
          <div className={`p-2 rounded-lg w-fit ${bg}`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>

          <p className="text-2xl font-bold text-gray-200 mt-3">{value}</p>
          <p className="text-gray-500 text-sm mt-1">{label}</p>
        </div>
      ))}
    </div>
  );
}