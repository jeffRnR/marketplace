// app/events/[id]/page.tsx
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import EventCard from "@/components/EventCard";
import { categories } from "@/data/categories";

interface PageProps {
  params: { id: string };
}

async function getEvent(id: number) {
  try {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        tickets: true,
        category: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    return event;
  } catch {
    return null;
  }
}

export default async function EventDetailPage({ params }: PageProps) {
  const eventId = Number(params.id);
  if (isNaN(eventId)) notFound();

  const event = await getEvent(eventId);
  if (!event) notFound();

  const localCategory = categories.find((c) => c.id === event.categoryId);
  if (!localCategory) notFound();

  const formattedDate = new Date(event.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
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
          type: t.type,
          price: t.price,
          link: t.link,
        }))}
        description={event.description}
        mapUrl={event.mapUrl ?? ""}
        host={event.host}
        attendees={event.attendees}
        category={{
          id: localCategory.id,
          name: localCategory.name,
          iconName: localCategory.iconName,
          iconColor: localCategory.iconColor,
        }}
      />
    </div>
  );
}