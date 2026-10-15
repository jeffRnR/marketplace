import { isAddress, keccak256, toBytes, type Address } from "viem";
import { prisma } from "@/lib/prisma";
import { computeSplit } from "@/lib/money";
import { chain, ROUTER, USDC, signQuote, toChainOrderId } from "@/lib/chain/router";
import { ramp, RampNotConfiguredError } from "@/lib/payments/ramp";
import { resolveRoute } from "@/lib/payments/routing";
import { getPayableOrder, requireUserId } from "@/lib/orders-port";

const QUOTE_TTL_SECONDS = 10 * 60;

export async function POST(req: Request) {
  const userId = await requireUserId(req);
  const { orderId, payerAddress } = (await req.json()) as { orderId: string; payerAddress: string };

  if (!isAddress(payerAddress)) {
    return Response.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  const order = await getPayableOrder(orderId, userId);
  if (order.listingCurrency !== "USDC") {
    return Response.json({ error: "This event is priced in KES" }, { status: 400 });
  }

  const route = resolveRoute(order.listingCurrency, order.payoutCurrency);
  let recipient: Address;
  try {
    recipient = route === "USDC_NATIVE" ? order.usdcPayoutAddress! : await ramp.getOfframpDepositAddress(order.organiserOwnerId);
  } catch (e) {
    if (e instanceof RampNotConfiguredError) return Response.json({ error: e.message }, { status: 501 });
    throw e;
  }

  if (!recipient || !isAddress(recipient)) {
    return Response.json({ error: "Organiser payout address missing" }, { status: 422 });
  }

  const split = computeSplit(order.faceMinor, "USDC");
  const payment = await prisma.payment.upsert({
    where: { orderId: order.id },
    update: {},
    create: {
      orderId: order.id,
      rail: "USDC_ONCHAIN",
      currency: "USDC",
      grossMinor: split.grossMinor,
      organiserNetMinor: split.organiserNetMinor,
      platformFeeMinor: split.platformFeeMinor,
      organiserOwnerId: order.organiserOwnerId,
      recipientAddress: recipient,
      releaseAt: order.releaseAt,
    },
  });

  if (payment.status !== "INITIATED") {
    return Response.json({ error: "Order already paid" }, { status: 409 });
  }

  const chainOrderId = toChainOrderId(payment.id);
  await prisma.payment.update({ where: { id: payment.id }, data: { chainOrderId, recipientAddress: recipient } });

  const expiry = BigInt(Math.floor(Date.now() / 1000) + QUOTE_TTL_SECONDS);
  const quote = {
    orderId: chainOrderId,
    eventId: keccak256(toBytes(order.eventId)),
    payer: payerAddress as Address,
    organiser: recipient,
    amount: payment.grossMinor,
    fee: payment.platformFeeMinor,
    expiry,
  };
  const signature = await signQuote(quote);

  return Response.json({
    chainId: chain.id,
    router: ROUTER,
    usdc: USDC,
    signature,
    quote: { ...quote, amount: quote.amount.toString(), fee: quote.fee.toString(), expiry: expiry.toString() },
  });
}
