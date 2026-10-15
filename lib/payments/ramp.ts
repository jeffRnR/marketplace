/**
 * Conversion between USDC and KES must be done by a licensed partner, not by Noizy Hub.
 */
export interface RampProvider {
  getOfframpDepositAddress(organiserOwnerId: string): Promise<`0x${string}`>;
  payoutKesAsUsdc(args: { reference: string; amountMinor: bigint; toAddress: `0x${string}` }): Promise<{ providerRef: string }>;
}

export class RampNotConfiguredError extends Error {
  constructor() {
    super("Cross-currency payouts need a licensed ramp partner. Not configured yet.");
  }
}

export const ramp: RampProvider = {
  async getOfframpDepositAddress() {
    throw new RampNotConfiguredError();
  },
  async payoutKesAsUsdc() {
    throw new RampNotConfiguredError();
  },
};
