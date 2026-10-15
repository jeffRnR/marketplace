import prisma from "@/lib/prisma";
import { sendTicketEmail } from "@/lib/notifications";

const DELIVERY_CLAIM_TTL_MS = 5 * 60 * 1000;

export async function sendTicketEmailForOrder(
  orderId: string,
  baseUrl: string,
): Promise<boolean> {
  const claimedAt = new Date();
  const claim = await prisma.order.updateMany({
    where: {
      id: orderId,
      status: "confirmed",
      ticketEmailSentAt: null,
      OR: [
        { ticketEmailClaimedAt: null },
        { ticketEmailClaimedAt: { lt: new Date(claimedAt.getTime() - DELIVERY_CLAIM_TTL_MS) } },
      ],
    },
    data: { ticketEmailClaimedAt: claimedAt },
  });
  if (!claim.count) return false;

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        event: { select: { id: true, title: true, date: true, location: true, accentColor: true, ticketStyle: true } },
        items: { select: { ticketType: true, quantity: true, price: true, ticketCode: true } },
      },
    });
    if (!order || order.status !== "confirmed") {
      throw new Error(`Confirmed ticket order is unavailable: ${orderId}`);
    }

    const eventDate = new Date(order.event.date).toLocaleDateString("en-KE", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    await sendTicketEmail({
      to: order.email,
      name: order.name,
      eventTitle: order.event.title,
      eventDate,
      eventLocation: order.event.location,
      items: order.items.map((item) => ({
        ...item,
        eventId: order.event.id,
        accentColor: order.event.accentColor,
        ticketStyle: order.event.ticketStyle === "minimal" ? "minimal" : "classic",
      })),
      totalAmount: order.totalAmount,
      isRsvp: order.isRsvp,
      orderId: order.id,
      baseUrl,
    });
    await prisma.order.updateMany({
      where: { id: orderId, ticketEmailSentAt: null, ticketEmailClaimedAt: claimedAt },
      data: { ticketEmailSentAt: new Date(), ticketEmailClaimedAt: null },
    });
    return true;
  } catch (error) {
    try {
      await prisma.order.updateMany({
        where: { id: orderId, ticketEmailSentAt: null, ticketEmailClaimedAt: claimedAt },
        data: { ticketEmailClaimedAt: null },
      });
    } catch (releaseError) {
      console.error("Unable to release ticket email delivery claim", { orderId, error: releaseError });
    }
    throw error;
  }
}
