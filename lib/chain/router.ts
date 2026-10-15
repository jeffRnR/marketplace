import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  parseAbi,
  parseAbiItem,
  toBytes,
  type Address,
  type Hex,
} from "viem";
import { avalanche, avalancheFuji } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { prisma } from "@/lib/prisma";
import { confirmPayment } from "@/lib/ledger";
import { onOrderPaid } from "@/lib/orders-port";

export const chain = process.env.CHAIN === "mainnet" ? avalanche : avalancheFuji;
export const ROUTER = process.env.ROUTER_ADDRESS as Address;
export const USDC = process.env.USDC_ADDRESS as Address;
const CONFIRMATIONS = BigInt(process.env.CHAIN_CONFIRMATIONS ?? "3");
const MAX_RANGE = BigInt(2000);
const ONE = BigInt(1);

export const publicClient = createPublicClient({
  chain,
  transport: http(process.env.AVAX_RPC_URL),
});

export const routerAbi = parseAbi([
  "function release(bytes32 orderId)",
  "function refund(bytes32 orderId)",
  "function payments(bytes32) view returns (address payer, address organiser, uint128 amount, uint128 fee, uint64 paidAt, uint8 status)",
  "event Paid(bytes32 indexed orderId, bytes32 indexed eventId, address indexed payer, address organiser, uint256 amount, uint256 fee)",
]);

const paidEvent = parseAbiItem(
  "event Paid(bytes32 indexed orderId, bytes32 indexed eventId, address indexed payer, address organiser, uint256 amount, uint256 fee)",
);

export const toChainOrderId = (paymentId: string): Hex => keccak256(toBytes(paymentId));

const quoteTypes = {
  Quote: [
    { name: "orderId", type: "bytes32" },
    { name: "eventId", type: "bytes32" },
    { name: "payer", type: "address" },
    { name: "organiser", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "fee", type: "uint256" },
    { name: "expiry", type: "uint64" },
  ],
} as const;

export async function signQuote(q: {
  orderId: Hex;
  eventId: Hex;
  payer: Address;
  organiser: Address;
  amount: bigint;
  fee: bigint;
  expiry: bigint;
}) {
  const account = privateKeyToAccount(process.env.QUOTE_SIGNER_PRIVATE_KEY as Hex);
  return account.signTypedData({
    domain: { name: "NoizyPaymentRouter", version: "1", chainId: chain.id, verifyingContract: ROUTER },
    types: quoteTypes,
    primaryType: "Quote",
    message: q,
  });
}

function operatorClient() {
  return createWalletClient({
    account: privateKeyToAccount(process.env.OPERATOR_PRIVATE_KEY as Hex),
    chain,
    transport: http(process.env.AVAX_RPC_URL),
  });
}

const STATUS_PAID = 1;
const STATUS_RELEASED = 2;

async function onchainStatus(chainOrderId: Hex): Promise<number> {
  const p = await publicClient.readContract({ address: ROUTER, abi: routerAbi, functionName: "payments", args: [chainOrderId] });
  return Number(p[5]);
}

export async function releaseOnChain(chainOrderId: Hex): Promise<Hex | null> {
  const status = await onchainStatus(chainOrderId);
  if (status === STATUS_RELEASED) return null;
  if (status !== STATUS_PAID) throw new Error(`Order ${chainOrderId} is not releasable (status ${status})`);
  const hash = await operatorClient().writeContract({ address: ROUTER, abi: routerAbi, functionName: "release", args: [chainOrderId] });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function refundOnChain(chainOrderId: Hex): Promise<Hex> {
  const hash = await operatorClient().writeContract({ address: ROUTER, abi: routerAbi, functionName: "refund", args: [chainOrderId] });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function syncPaidEvents(): Promise<{ scanned: number; confirmed: number }> {
  const head = await publicClient.getBlockNumber();
  const safeHead = head - CONFIRMATIONS;
  const cursor = await prisma.chainCursor.findUnique({ where: { id: "router" } });
  const from = cursor ? cursor.lastBlock + ONE : BigInt(process.env.ROUTER_DEPLOY_BLOCK ?? "0");
  if (from > safeHead) return { scanned: 0, confirmed: 0 };
  const to = from + MAX_RANGE < safeHead ? from + MAX_RANGE : safeHead;

  const logs = await publicClient.getLogs({
    address: ROUTER,
    event: paidEvent,
    fromBlock: from,
    toBlock: to,
  });

  let confirmed = 0;
  for (const log of logs) {
    const { orderId, organiser, amount, fee } = log.args;
    if (!orderId || !log.transactionHash) continue;
    const payment = await prisma.payment.findUnique({ where: { chainOrderId: orderId } });
    if (!payment || payment.status !== "INITIATED") continue;

    const matches =
      amount === payment.grossMinor &&
      fee === payment.platformFeeMinor &&
      organiser?.toLowerCase() === payment.recipientAddress?.toLowerCase();
    if (!matches) {
      console.error("USDC payment does not match its quote", { paymentId: payment.id, tx: log.transactionHash });
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
      continue;
    }
    const res = await confirmPayment(payment.id, log.transactionHash);
    if (!res.alreadyProcessed) {
      await onOrderPaid(payment.orderId);
      confirmed++;
    }
  }

  await prisma.chainCursor.upsert({
    where: { id: "router" },
    update: { lastBlock: to },
    create: { id: "router", lastBlock: to },
  });
  return { scanned: logs.length, confirmed };
}
