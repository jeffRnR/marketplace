// app/events/[id]/page.tsx
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import EventCard from "@/components/EventCard";
import { categories as staticCategories } from "@/data/categories";

interface PageProps {
  params: { id: string };
}

async function getEvent(id: number) {
  try {
    return await prisma.event.findUnique({
      where: { id },
      include: {
        tickets:    true,
        categories: { include: { category: true } }, // many-to-many join
        createdBy:  { select: { id: true, name: true, email: true } },
      },
    });
  } catch {
    return null;
  }
}

export default async function EventDetailPage({ params }: PageProps) {
  const eventId = Number(params.id);
  if (isNaN(eventId)) notFound();

  const event = await getEvent(eventId);
  if (!event) notFound();

  // Flatten join table → plain category objects
  const eventCategories = event.categories.map((ec) => ec.category);

  // Use the first category to resolve the static icon data (iconName lives in static array)
  const primaryCategory  = eventCategories[0];
  const localCategory    = primaryCategory
    ? staticCategories.find((c) => c.id === primaryCategory.id)
    : null;

  // Only 404 if the event has NO categories at all
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
          type:  t.type,
          price: t.price,
          link:  t.link,
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