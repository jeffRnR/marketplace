import { prisma } from "@/lib/prisma";
import { computeSplit } from "@/lib/money";
import { assertStkPushConfigured, initiateStkPush } from "@/lib/daraja";
import { getPayableOrder, requireUserId } from "@/lib/orders-port";

export async function POST(req: Request) {
  const userId = await requireUserId(req);
  const { orderId } = (await req.json()) as { orderId: string };
  const order = await getPayableOrder(orderId, userId);

  if (order.listingCurrency !== "KES") {
    return Response.json({ error: "This event is priced in USDC" }, { status: 400 });
  }
  if (!order.buyerPhone) {
    return Response.json({ error: "A phone number is required for M-Pesa checkout" }, { status: 422 });
  }
  assertStkPushConfigured();

  const split = computeSplit(order.faceMinor, "KES");
  if (split.grossMinor % BigInt(100) !== BigInt(0)) {
    return Response.json({ error: "Daraja payments require a whole-KES amount" }, { status: 400 });
  }
  const payment = await prisma.payment.upsert({
    where: { orderId: order.id },
    update: {},
    create: {
      orderId: order.id,
      rail: "DARAJA",
      currency: "KES",
      grossMinor: split.grossMinor,
      organiserNetMinor: split.organiserNetMinor,
      platformFeeMinor: split.platformFeeMinor,
      organiserOwnerId: order.organiserOwnerId,
      releaseAt: order.releaseAt,
    },
  });

  if (payment.status !== "INITIATED") {
    return Response.json({ error: "Order already paid" }, { status: 409 });
  }
  if (payment.checkoutRequestId || payment.stkRequestStartedAt) {
    return Response.json({
      txRef: payment.id,
      checkoutRequestId: payment.checkoutRequestId,
      merchantRequestId: payment.merchantRequestId,
      status: "PROCESSING",
    });
  }

  const started = await prisma.payment.updateMany({
    where: { id: payment.id, status: "INITIATED", stkRequestStartedAt: null },
    data: { stkRequestStartedAt: new Date() },
  });
  if (!started.count) {
    return Response.json({ txRef: payment.id, status: "PROCESSING" });
  }

  const parts = (order.buyerName ?? "Customer").trim().split(/\s+/);
  const result = await initiateStkPush({
    phone: order.buyerPhone,
    amount: Number(payment.grossMinor / BigInt(100)),
    currency: "KES",
    apiRef: payment.id,
    narrative: `Order ${order.id}`,
    email: order.buyerEmail,
    firstName: parts[0] || "Customer",
    lastName: parts.slice(1).join(" ") || parts[0] || "Customer",
  });
  if (!result.success || !result.checkoutRequestId || !result.merchantRequestId) {
    console.error("Daraja STK request outcome is unknown; payment remains pending for reconciliation", { paymentId: payment.id, error: result.message });
    return Response.json({
      txRef: payment.id,
      status: "PROCESSING",
      message: "Payment request is awaiting Daraja reconciliation",
    }, { status: 202 });
  }
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      checkoutRequestId: result.checkoutRequestId,
      merchantRequestId: result.merchantRequestId,
    },
  });

  return Response.json({
    txRef: payment.id,
    checkoutRequestId: result.checkoutRequestId,
    merchantRequestId: result.merchantRequestId,
    message: "Check your phone and enter your M-Pesa PIN to complete payment.",
  });
}
