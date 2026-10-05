"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { CalendarDays, CheckCircle, Clock3, Loader2, MapPin, Ticket, TicketCheck } from "lucide-react";

interface PurchasedTicket {
  ticketCode: string;
  ticketType: string;
  price: string;
  quantity: number;
  checkedIn: boolean;
  orderId: string;
  purchasedAt: string;
  isRsvp: boolean;
  event: {
    id: string;
    title: string;
    date: string;
    time: string;
    location: string;
    image: string | null;
  };
}

export default function MyTicketsPage() {
  const { status } = useSession();
  const [tickets, setTickets] = useState<PurchasedTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      setLoading(false);
      return;
    }

    let cancelled = false;
    fetch("/api/my-tickets")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not load tickets.");
        if (!cancelled) setTickets(data.tickets);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load tickets.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [status]);

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 pb-16 pt-28 text-[var(--foreground)] sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 border-b border-[var(--border)] pb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-green)]">Your account</p>
          <h1 className="mt-2 text-3xl font-bold">My Tickets</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Your confirmed event tickets, all in one place.</p>
        </header>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-20 text-sm text-[var(--muted)]">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading your tickets...
          </div>
        ) : status !== "authenticated" ? (
          <div className="border-y border-[var(--border)] py-10 text-center">
            <Ticket className="mx-auto h-8 w-8 text-[var(--muted)]" />
            <p className="mt-3 font-semibold">Sign in to see your tickets</p>
            <Link href="/auth/signin" className="mt-4 inline-block text-sm font-semibold text-[var(--brand-green)] hover:underline">
              Sign in
            </Link>
          </div>
        ) : error ? (
          <p role="alert" className="border-y border-red-500/30 py-6 text-sm text-red-400">{error}</p>
        ) : tickets.length === 0 ? (
          <div className="border-y border-[var(--border)] py-10 text-center">
            <Ticket className="mx-auto h-8 w-8 text-[var(--muted)]" />
            <p className="mt-3 font-semibold">No confirmed tickets yet</p>
            <Link href="/events/all" className="mt-4 inline-block text-sm font-semibold text-[var(--brand-green)] hover:underline">
              Browse events
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {tickets.map((ticket) => (
              <article key={ticket.ticketCode} className="grid gap-5 py-6 sm:grid-cols-[160px_1fr_auto] sm:items-center">
                <Link href={`/events/${ticket.event.id}`} className="block aspect-[16/10] overflow-hidden bg-[var(--surface)] sm:aspect-square">
                  {ticket.event.image ? (
                    <img src={ticket.event.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[var(--muted)]"><Ticket className="h-8 w-8" /></div>
                  )}
                </Link>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold uppercase tracking-wide text-[var(--brand-green)]">{ticket.ticketType}</span>
                    <span className="text-[var(--muted)]">{ticket.isRsvp ? "Free RSVP" : ticket.price}</span>
                    {ticket.checkedIn && (
                      <span className="inline-flex items-center gap-1 text-emerald-500"><CheckCircle className="h-3.5 w-3.5" /> Checked in</span>
                    )}
                  </div>
                  <h2 className="mt-1 truncate text-xl font-bold">{ticket.event.title}</h2>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--muted)]">
                    <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{new Date(ticket.event.date).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })} · {ticket.event.time}</span>
                    <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{ticket.event.location}</span>
                  </div>
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--muted)]">
                    <Clock3 className="h-3.5 w-3.5" /> Purchased {new Date(ticket.purchasedAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                    {ticket.quantity > 1 && ` · ${ticket.quantity} tickets`}
                  </p>
                </div>
                <Link
                  href={`/ticket/${ticket.ticketCode}`}
                  className="inline-flex h-10 items-center justify-center gap-2 border border-[var(--border)] px-4 text-sm font-semibold transition hover:border-[var(--brand-green)] hover:text-[var(--brand-green)]"
                >
                  <TicketCheck className="h-4 w-4" /> View ticket
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}