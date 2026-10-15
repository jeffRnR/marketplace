import { toMinor } from "@/lib/money";
import { beginPayoutProcessing, getBalances, markPayoutProcessing, reservePayout, InsufficientFundsError } from "@/lib/ledger";
import { assertB2CConfigured, createTransfer } from "@/lib/daraja";
import { getPayoutProfile, requireUserId } from "@/lib/orders-port";
import { normalizeMpesaPhone } from "@/lib/mpesaPhone";

const MIN_PAYOUT_MINOR = toMinor("100", "KES");

export async function GET(req: Request) {
  const profile = await getPayoutProfile(await requireUserId(req));
  const wallets = await getBalances(profile.ownerType, profile.ownerId);
  return Response.json({
    wallets: wallets.map((w) => ({
      currency: w.currency,
      pending: w.pendingMinor.toString(),
      available: w.availableMinor.toString(),
    })),
  });
}

export async function POST(req: Request) {
  const profile = await getPayoutProfile(await requireUserId(req));
  let body: { amount?: unknown; idempotencyKey?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!profile.kycVerified) return Response.json({ error: "Verify your identity before withdrawing" }, { status: 403 });
  if (!profile.mpesaPhone) return Response.json({ error: "Add an M-Pesa number first" }, { status: 422 });
  const phone = normalizeMpesaPhone(profile.mpesaPhone);
  if (!phone) return Response.json({ error: "The saved M-Pesa number is invalid" }, { status: 422 });
  const amount = typeof body.amount === "string" || typeof body.amount === "number" ? String(body.amount) : "";
  const idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : "";
  if (!idempotencyKey) return Response.json({ error: "idempotencyKey required" }, { status: 400 });

  let amountMinor: bigint;
  try {
    amountMinor = toMinor(amount, "KES");
  } catch {
    return Response.json({ error: "Invalid payout amount" }, { status: 400 });
  }
  if (amountMinor % BigInt(100) !== BigInt(0)) return Response.json({ error: "Payouts must be a whole-KES amount" }, { status: 400 });
  if (amountMinor < MIN_PAYOUT_MINOR) return Response.json({ error: "Minimum withdrawal is KES 100" }, { status: 400 });
  assertB2CConfigured();

  let payout;
  try {
    payout = await reservePayout({
      ownerType: profile.ownerType,
      ownerId: profile.ownerId,
      currency: "KES",
      amountMinor,
      destination: phone,
      idempotencyKey: `${profile.ownerType}:${profile.ownerId}:${idempotencyKey}`,
    });
  } catch (e) {
    if (e instanceof InsufficientFundsError) return Response.json({ error: "Insufficient available balance" }, { status: 422 });
    if (e instanceof Error && e.message.startsWith("Idempotency key")) return Response.json({ error: e.message }, { status: 409 });
    throw e;
  }
  if (payout.status !== "REQUESTED") return Response.json({ payoutId: payout.id, status: payout.status });

  if (!await beginPayoutProcessing(payout.id)) {
    return Response.json({ payoutId: payout.id, status: "PROCESSING" });
  }
  try {
    const t = await createTransfer({ reference: payout.id, amountMinor, phone, narration: "Noizy Hub payout" });
    await markPayoutProcessing(payout.id, t.providerRef, t.originatorConversationId, t.conversationId);
    return Response.json({ payoutId: payout.id, status: "PROCESSING" });
  } catch (e) {
    console.error("Daraja B2C request outcome is unknown; payout remains reserved for reconciliation", { payoutId: payout.id, error: e });
    return Response.json({ payoutId: payout.id, status: "PROCESSING", message: "Payout is awaiting Daraja reconciliation" }, { status: 202 });
  }
}
