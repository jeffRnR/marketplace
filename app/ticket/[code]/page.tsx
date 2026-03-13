// app/ticket/[code]/page.tsx
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import TicketView from "./TicketView";

interface PageProps { params: Promise<{ code: string }> }

export default async function TicketPage({ params }: PageProps) {
  const { code } = await params;

  const item = await prisma.orderItem.findUnique({
    where: { ticketCode: code },
    include: {
      order: {
        select: {
          id:    true,
          name:  true,
          email: true,
          isRsvp: true,
          status: true,
        },
      },
    },
  });

  if (!item) notFound();

  const ticket = await prisma.ticket.findUnique({ where: { id: item.ticketId } });
  if (!ticket) notFound();

  const event = await prisma.event.findUnique({
    where:  { id: ticket.eventId },
    select: { id: true, title: true, date: true, time: true, location: true, host: true, image: true },
  });
  if (!event) notFound();

  const formattedDate = new Date(event.date).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  return (
    <TicketView
      ticketCode={code}
      ticketType={item.ticketType}
      price={item.price}
      quantity={item.quantity}
      holderName={item.order.name}
      holderEmail={item.order.email}
      isRsvp={item.order.isRsvp}
      orderId={item.order.id}
      status={item.order.status}
      event={{
        id:       event.id,
        title:    event.title,
        date:     formattedDate,
        time:     event.time,
        location: event.location,
        host:     event.host,
        image:    event.image,
      }}
    />
  );
}