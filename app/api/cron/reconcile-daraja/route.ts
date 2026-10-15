import prisma from "@/lib/prisma";
import { reconcileStaleDarajaPayment } from "@/lib/daraja-reconciliation";
import { sendTicketEmailForOrder } from "@/lib/ticket-email-delivery";
import { PAYMENT_CONFIRMATION_TIMEOUT_MS } from "@/lib/paymentTiming";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response("Cron authentication is not configured", { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const cutoff = new Date(Date.now() - PAYMENT_CONFIRMATION_TIMEOUT_MS);
  const [records, ledgerPayments] = await Promise.all([
    prisma.paymentRecord.findMany({
      where: { status: "pending", checkoutRequestId: { not: null }, updatedAt: { lte: cutoff } },
      select: { txRef: true },
      orderBy: { updatedAt: "asc" },
      take: 50,
    }),
    prisma.payment.findMany({
      where: { status: "INITIATED", checkoutRequestId: { not: null }, updatedAt: { lte: cutoff } },
      select: { id: true },
      orderBy: { updatedAt: "asc" },
      take: 50,
    }),
  ]);
  const emailRetries = await prisma.order.findMany({
    where: {
      status: "confirmed",
      ticketEmailSentAt: null,
      OR: [
        { ticketEmailClaimedAt: null },
        { ticketEmailClaimedAt: { lt: new Date(Date.now() - 5 * 60 * 1000) } },
      ],
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: 25,
  });
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (emailRetries.length && !baseUrl) {
    throw new Error("NEXT_PUBLIC_BASE_URL is required for scheduled ticket email delivery");
  }

  const tasks = [
    ...records.map(({ txRef }) => () => reconcileStaleDarajaPayment(txRef, "record")),
    ...ledgerPayments.map(({ id }) => () => reconcileStaleDarajaPayment(id, "ledger")),
    ...emailRetries.map(({ id }) => () => sendTicketEmailForOrder(id, baseUrl!)),
  ];
  let failures = 0;
  for (let offset = 0; offset < tasks.length; offset += 10) {
    const results = await Promise.allSettled(tasks.slice(offset, offset + 10).map((task) => task()));
    failures += results.filter((result) => result.status === "rejected").length;
  }
  if (failures) console.error("Daraja payment reconciliation failures", { failures });

  return Response.json({
    checked: tasks.length,
    failures,
  }, { headers: { "Cache-Control": "no-store" } });
}
