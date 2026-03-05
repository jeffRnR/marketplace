"use client";
// app/my-events/components/AttendeePanel.tsx

import React, { useState } from "react";
import { Search, Download, CheckCircle, Clock, AlertCircle, UserCheck, Users } from "lucide-react";
import { ManagedEvent } from "../types";
import { FillBar } from "./FillBar";

interface Attendee {
  id: string; name: string; email: string;
  ticketType: string; checkedIn: boolean; purchasedAt: string;
}

function mock(event: ManagedEvent): Attendee[] {
  const types = event.tickets.map((t) => t.type);
  const names = [
    "Amara Osei","Liam Njoroge","Fatima Al-Amin","David Kimani","Sofia Mensah",
    "Kofi Asante","Zara Ahmed","Brian Otieno","Nadia Waweru","Marcus Odhiambo",
    "Yasmin Hassan","Peter Mwangi",
  ];
  return Array.from({ length: Math.min(event.attendees, 12) }, (_, i) => ({
    id: `a${i}`,
    name: names[i % names.length],
    email: `${names[i % names.length].toLowerCase().replace(" ", ".")}@email.com`,
    ticketType: types[i % types.length] ?? "General",
    checkedIn: i < Math.floor(event.attendees * 0.6),
    purchasedAt: new Date(Date.now() - i * 86400000).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    }),
  }));
}

export function AttendeePanel({ event }: { event: ManagedEvent }) {
  const [search, setSearch] = useState("");
  const [attendees, setAttendees] = useState<Attendee[]>(() => mock(event));

  const checkedIn = attendees.filter((a) => a.checkedIn).length;
  const checkInRate = Math.round((checkedIn / Math.max(event.attendees, 1)) * 100);

  const filtered = attendees.filter((a) =>
    [a.name, a.email, a.ticketType].some((v) => v.toLowerCase().includes(search.toLowerCase()))
  );

  const toggle = (id: string) =>
    setAttendees((p) => p.map((a) => a.id === id ? { ...a, checkedIn: !a.checkedIn } : a));

  const exportCSV = () => {
    const csv = [
      ["Name","Email","Ticket Type","Checked In","Purchased"],
      ...attendees.map((a) => [a.name, a.email, a.ticketType, a.checkedIn ? "Yes" : "No", a.purchasedAt]),
    ].map((r) => r.join(",")).join("\n");
    const el = document.createElement("a");
    el.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    el.download = `${event.title}-attendees.csv`;
    el.click();
  };

  return (
    <div className="flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-gray-300 font-bold text-[1.5rem]">
            {checkedIn}
            <span className="text-gray-500 text-md font-normal"> / {event.attendees} checked in</span>
          </p>
          <p className="text-gray-400 text-sm mt-0.5">
            {event.attendees - checkedIn > 0
              ? `${event.attendees - checkedIn} people still expected`
              : "Everyone's arrived"}
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-gray-200 border border-gray-600 hover:border-gray-400 bg-gray-800 rounded-lg px-3 py-1.5 transition duration-300"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Progress + stats */}
      <div className="flex flex-col gap-3">
        <FillBar rate={checkInRate}/>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Users,     label: "Expected",   value: event.attendees,             color: "text-gray-300" },
            { icon: UserCheck, label: "Checked in", value: checkedIn,                   color: "text-green-400" },
            { icon: Clock,     label: "Pending",    value: event.attendees - checkedIn, color: "text-purple-400" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-gray-700/40 border border-gray-700 rounded-lg py-3 px-3 text-center">
              <Icon className={`w-4 h-4 mx-auto mb-1.5 ${color}`} />
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email or ticket type..."
          className="w-full bg-gray-800 text-gray-300 rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none border border-gray-700 text-sm"
        />
      </div>

      {/* Attendee list */}
      <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-10">No attendees match your search</p>
        ) : filtered.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-3 bg-gray-700/30 hover:bg-gray-700/60 border border-gray-700 hover:border-gray-600 rounded-lg px-4 py-3 transition duration-300"
          >
            <div className="w-8 h-8 rounded-full bg-gray-600 border border-gray-500 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-gray-300">{a.name.charAt(0)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-300 truncate">{a.name}</p>
              <p className="text-xs text-gray-500 truncate">{a.email}</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-md">{a.ticketType}</span>
              <span className="text-xs text-gray-600">{a.purchasedAt}</span>
            </div>
            <button
              onClick={() => toggle(a.id)}
              className={`shrink-0 flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition duration-300 ${
                a.checkedIn
                  ? "bg-green-900/30 border-green-700/50 text-green-400"
                  : "border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200"
              }`}
            >
              {a.checkedIn ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{a.checkedIn ? "Checked in" : "Check in"}</span>
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-3">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        Showing sample data · Connect a purchases table for real attendee records
      </div>
    </div>
  );
}