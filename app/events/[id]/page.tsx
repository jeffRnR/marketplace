// app/events/[id]/page.tsx
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import EventCard from "@/components/EventCard";
import { categories as staticCategories } from "@/data/categories";

interface PageProps { params: Promise<{ id: string }> }

async function getEvent(id: number) {
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

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params;
  const eventId = Number(id);
  if (isNaN(eventId)) notFound();

  const event = await getEvent(eventId);
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
      <EventCard
        eventId={event.id}
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
        attendees={event.attendees}
        category={{
          id:        primaryCategory.id,
          name:      primaryCategory.name,
          iconName:  localCategory?.iconName  ?? "",
          iconColor: localCategory?.iconColor ?? primaryCategory.iconColor ?? "",
        }}
      />
    </div>
  );
}