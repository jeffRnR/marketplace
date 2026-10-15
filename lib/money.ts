export type Currency = "KES" | "USDC";

export const DECIMALS: Record<Currency, number> = { KES: 2, USDC: 6 };
const ZERO = BigInt(0);
const TEN_THOUSAND = BigInt(10000);

export const FEES: Record<Currency, { percentBps: bigint; fixedMinor: bigint }> = {
  KES: { percentBps: BigInt(500), fixedMinor: BigInt(3000) },
  USDC: { percentBps: BigInt(500), fixedMinor: ZERO },
};

export function toMinor(value: string, currency: Currency): bigint {
  const d = DECIMALS[currency];
  const [whole, frac = ""] = value.trim().split(".");
  if (!/^\d+$/.test(whole) || !/^\d*$/.test(frac) || frac.length > d) {
    throw new Error(`Invalid ${currency} amount: ${value}`);
  }
  return BigInt(whole + frac.padEnd(d, "0"));
}

export function fromMinor(minor: bigint, currency: Currency): string {
  const d = DECIMALS[currency];
  const s = minor.toString().padStart(d + 1, "0");
  return `${s.slice(0, -d)}.${s.slice(-d)}`;
}

export function computeSplit(faceMinor: bigint, currency: Currency) {
  const { percentBps, fixedMinor } = FEES[currency];
  const platformFeeMinor = fixedMinor + (faceMinor * percentBps) / TEN_THOUSAND;
  return { organiserNetMinor: faceMinor, platformFeeMinor, grossMinor: faceMinor + platformFeeMinor };
}
