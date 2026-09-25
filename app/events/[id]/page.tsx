// app/events/[id]/page.tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import EventCard from "@/components/EventCard";
import EventVendors from "@/components/EventVendors";
import TrackView from "@/components/TrackView";
import { categories as staticCategories } from "@/data/categories";

interface PageProps { params: Promise<{ id: string }> }

async function getEvent(id: string) {
  try {
    return await prisma.event.findUnique({
      where: { id },
      include: {
        tickets:    true,
        categories: { include: { category: true } },
        createdBy:  { select: { id: true, name: true, email: true } },
      },
    });
  } catch { return null; }
}

// ── Open Graph metadata ───────────────────────────────────────────────────────
// This powers the preview card when the link is shared on WhatsApp, Twitter,
// iMessage, Telegram, LinkedIn, Facebook, etc.

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const event = await getEvent(id);

  if (!event) {
    return { title: "Event not found" };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:4000";
  const formattedDate = new Date(event.date).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
  const description = `${formattedDate} · ${event.location}\n\n${event.description?.slice(0, 160) ?? ""}`;

  return {
    title:       event.title,
    description,
    openGraph: {
      title:       event.title,
      description,
      url:         `${baseUrl}/events/${event.id}`,
      siteName:    "Noizy Hub",
      type:        "website",
      images: [
        {
          url:    event.image,   // your uploaded event image
          width:  1200,
          height: 630,
          alt:    event.title,
        },
      ],
    },
    twitter: {
      card:        "summary_large_image",
      title:       event.title,
      description,
      images:      [event.image],
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();

  const eventCategories = event.categories.map((ec) => ec.category);
  const primaryCategory = eventCategories[0];
  const localCategory   = primaryCategory
    ? staticCategories.find((c) => c.id === primaryCategory.id) : null;
  if (!primaryCategory) notFound();

  const formattedDate = new Date(event.date).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <div className="p-4 lg:w-[70%] min-h-screen mt-14 w-full mx-auto">
      <TrackView eventId={event.id} />

      <EventCard
        eventId={String(event.id)}
        createdById={event.createdById}
        image={event.image}
        title={event.title}
        date={formattedDate}
        time={event.time}
        location={event.location}
        tickets={event.tickets.map((t) => ({
          id:       t.id,
          type:     t.type,
          price:    t.price,
          link:     t.link,
          isActive: t.isActive,
          startsAt: t.startsAt ? t.startsAt.toISOString() : null,
          endsAt:   t.endsAt   ? t.endsAt.toISOString()   : null,
        }))}
        description={event.description}
        mapUrl={event.mapUrl ?? ""}
        host={event.host}
        attendees={event.showAttendees ? event.attendees : null}
        category={{
          id:        primaryCategory.id,
          name:      primaryCategory.name,
          iconName:  localCategory?.iconName  ?? "",
          iconColor: localCategory?.iconColor ?? primaryCategory.iconColor ?? "",
        }}
      />

      <EventVendors eventId={String(event.id)} />
    </div>
  );
}