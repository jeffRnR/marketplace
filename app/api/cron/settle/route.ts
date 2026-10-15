import { prisma } from "@/lib/prisma";
import { releasePending, settleOnchainRelease } from "@/lib/ledger";
import { releaseOnChain, syncPaidEvents, toChainOrderId } from "@/lib/chain/router";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response("Cron authentication is not configured", { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const chain = await syncPaidEvents();

  const due = await prisma.payment.findMany({
    where: { status: "CONFIRMED", releaseAt: { lte: new Date() } },
    take: 50,
    orderBy: { releaseAt: "asc" },
  });

  let released = 0;
  const failures: string[] = [];
  for (const p of due) {
    try {
      if (p.rail === "DARAJA") {
        await releasePending(p.id);
      } else {
        const hash = await releaseOnChain((p.chainOrderId ?? toChainOrderId(p.id)) as `0x${string}`);
        await settleOnchainRelease(p.id, hash ?? "already-released");
      }
      released++;
    } catch (e) {
      failures.push(p.id);
      console.error("Release failed", p.id, e);
    }
  }

  return Response.json({ chain, released, failures });
}
