import type { Currency } from "@/lib/money";

export type Route = "FIAT_NATIVE" | "USDC_NATIVE" | "USDC_TO_FIAT_RAMP" | "FIAT_TO_USDC_RAMP";

export function resolveRoute(listing: Currency, payout: Currency): Route {
  if (listing === "KES") return payout === "KES" ? "FIAT_NATIVE" : "FIAT_TO_USDC_RAMP";
  return payout === "USDC" ? "USDC_NATIVE" : "USDC_TO_FIAT_RAMP";
}
