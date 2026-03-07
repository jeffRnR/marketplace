// app/ticket/[code]/page.tsx
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import TicketView from "./TicketView";

interface PageProps { params: { code: string } }

async function getTicket(code: string) {
  try {
    const item = await prisma.orderItem.findUnique({
      where: { ticketCode: code },
      include: {
        order: {
          include: {
            event: {
              select: { id: true, title: true, date: true, time: true, location: true, host: true, image: true },
            },
          },
        },
      },
    });
    return item;
  } catch { return null; }
}

export default async function TicketPage({ params }: PageProps) {
  const item = await getTicket(params.code);
  if (!item) notFound();

  const eventDate = new Date(item.order.event.date).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  return (
    <TicketView
      ticketCode={item.ticketCode}
      ticketType={item.ticketType}
      price={item.price}
      quantity={item.quantity}
      holderName={item.order.name}
      holderEmail={item.order.email}
      isRsvp={item.order.isRsvp}
      orderId={item.order.id}
      status={item.order.status}
      event={{
        id:       item.order.event.id,
        title:    item.order.event.title,
        date:     eventDate,
        time:     item.order.event.time,
        location: item.order.event.location,
        host:     item.order.event.host,
        image:    item.order.event.image,
      }}
    />
  );
}