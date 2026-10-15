import prisma from "@/lib/prisma";
import { markPayoutFailed, markPayoutPaid } from "@/lib/ledger";

type ResultParameter = { Key?: string; Value?: string | number };
type DarajaB2CResult = {
  Result?: {
    ConversationID?: string;
    OriginatorConversationID?: string;
    ResultCode?: number | string;
    ResultDesc?: string;
    ResultParameters?: { ResultParameter?: ResultParameter[] };
  };
};

export async function POST(req: Request) {
  let body: DarajaB2CResult;
  try {
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > 32_768) return Response.json({ error: "Callback too large" }, { status: 413 });
    const raw = await req.text();
    if (raw.length > 32_768) return Response.json({ error: "Callback too large" }, { status: 413 });
    body = JSON.parse(raw) as DarajaB2CResult;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const result = body.Result;
  const originatorConversationId = result?.OriginatorConversationID;
  const conversationId = result?.ConversationID;
  const resultCode = typeof result?.ResultCode === "number"
    ? result.ResultCode
    : typeof result?.ResultCode === "string" && /^\d+$/.test(result.ResultCode)
      ? Number(result.ResultCode)
      : Number.NaN;
  if (
    !result ||
    typeof originatorConversationId !== "string" ||
    typeof conversationId !== "string" ||
    originatorConversationId.length > 200 ||
    conversationId.length > 200 ||
    !Number.isSafeInteger(resultCode)
  ) {
    return Response.json({ error: "Missing Daraja B2C result identifiers" }, { status: 400 });
  }

  const payout = await prisma.payout.findUnique({ where: { originatorConversationId } });
  if (payout) {
    if (!payout.conversationId || payout.conversationId !== conversationId) {
      console.error("Daraja B2C conversation identifier mismatch", { payoutId: payout.id });
      return Response.json({ error: "Payout identifiers do not match" }, { status: 400 });
    }
    if (payout.status === "PAID" || payout.status === "FAILED") return Response.json({ received: true, duplicate: true });
    const parameters = new Map((result.ResultParameters?.ResultParameter ?? []).map((item) => [item.Key ?? "", item.Value]));
    const resultAmount = parameters.get("TransactionAmount");
    const expectedAmount = Number(payout.amountMinor / BigInt(100));
    if (resultAmount !== undefined && Number(resultAmount) !== expectedAmount) {
      console.error("Daraja B2C amount mismatch", { payoutId: payout.id });
      return Response.json({ error: "Payout amount does not match" }, { status: 400 });
    }
    if (resultCode === 0) {
      if (resultAmount === undefined) {
        console.error("Daraja B2C amount is missing", { payoutId: payout.id });
        return Response.json({ error: "Payout amount could not be verified" }, { status: 503 });
      }
      await markPayoutPaid(payout.id);
      return Response.json({ received: true, status: "PAID" });
    }
    await markPayoutFailed(payout.id, result.ResultDesc ?? "Daraja B2C payout failed");
    return Response.json({ received: true, status: "FAILED" });
  }

  const withdrawal = await prisma.withdrawalRequest.findUnique({ where: { originatorConversationId } });
  if (!withdrawal) {
    console.warn("Daraja B2C callback does not match a withdrawal");
    return Response.json({ error: "Payout not yet correlated" }, { status: 503 });
  }
  if (!withdrawal.conversationId || withdrawal.conversationId !== conversationId) {
    console.error("Daraja B2C conversation identifier mismatch", { withdrawalId: withdrawal.id });
    return Response.json({ error: "Payout identifiers do not match" }, { status: 400 });
  }
  if (withdrawal.status === "paid" || withdrawal.status === "failed") {
    return Response.json({ received: true, duplicate: true });
  }

  const parameters = new Map((result.ResultParameters?.ResultParameter ?? []).map((item) => [item.Key ?? "", item.Value]));
  const resultAmount = parameters.get("TransactionAmount");
  if (resultAmount !== undefined && Number(resultAmount) !== withdrawal.amount) {
    console.error("Daraja B2C amount mismatch", { withdrawalId: withdrawal.id });
    return Response.json({ error: "Payout amount does not match" }, { status: 400 });
  }
  if (resultCode === 0) {
    if (resultAmount === undefined) {
      console.error("Daraja B2C amount is missing", { withdrawalId: withdrawal.id });
      return Response.json({ error: "Payout amount could not be verified" }, { status: 503 });
    }
    await prisma.withdrawalRequest.updateMany({
      where: { id: withdrawal.id, status: "processing" },
      data: { status: "paid" },
    });
    return Response.json({ received: true, status: "paid" });
  }

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.withdrawalRequest.updateMany({
      where: { id: withdrawal.id, status: "processing" },
      data: { status: "failed", failureNote: result.ResultDesc ?? "Daraja B2C payout failed" },
    });
    if (!claimed.count) return;
    const wallet = await tx.vendorWallet.findUniqueOrThrow({ where: { id: withdrawal.walletId } });
    const restoredBalance = Math.round((wallet.balance + withdrawal.amount) * 100) / 100;
    await tx.vendorWallet.update({
      where: { id: wallet.id },
      data: {
        balance: restoredBalance,
        totalWithdrawn: { decrement: withdrawal.amount },
      },
    });
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "refund",
        amount: withdrawal.amount,
        description: `Withdrawal refund — ${result.ResultDesc ?? "Daraja B2C payout failed"}`,
        balanceAfter: restoredBalance,
      },
    });
  });
  return Response.json({ received: true, status: "failed" });
}
