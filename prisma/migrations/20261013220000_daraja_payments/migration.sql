DO $$ BEGIN
  CREATE TYPE "Currency" AS ENUM ('KES', 'USDC');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "WalletOwnerType" AS ENUM ('ORGANISER', 'VENDOR', 'PLATFORM', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "BalanceBucket" AS ENUM ('PENDING', 'AVAILABLE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "PaymentRail" AS ENUM ('DARAJA', 'USDC_ONCHAIN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TYPE "PaymentRail" ADD VALUE IF NOT EXISTS 'DARAJA';
DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('INITIATED', 'CONFIRMED', 'RELEASED', 'REFUNDED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "PayoutMethod" AS ENUM ('MPESA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "PayoutStatus" AS ENUM ('REQUESTED', 'PROCESSING', 'PAID', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Event"
  ADD COLUMN IF NOT EXISTS "listingCurrency" "Currency" NOT NULL DEFAULT 'KES',
  ADD COLUMN IF NOT EXISTS "payoutCurrency" "Currency" NOT NULL DEFAULT 'KES',
  ADD COLUMN IF NOT EXISTS "usdcPayoutAddress" TEXT;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'PaymentRecord' AND column_name = 'flwRef'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'PaymentRecord' AND column_name = 'providerRef'
  ) THEN
    ALTER TABLE "PaymentRecord" RENAME COLUMN "flwRef" TO "providerRef";
  END IF;
END $$;
ALTER TABLE "PaymentRecord"
  ADD COLUMN IF NOT EXISTS "providerRef" TEXT,
  ADD COLUMN IF NOT EXISTS "checkoutRequestId" TEXT,
  ADD COLUMN IF NOT EXISTS "merchantRequestId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentRecord_checkoutRequestId_key" ON "PaymentRecord"("checkoutRequestId");

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'WithdrawalRequest' AND column_name = 'flwTransferRef'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'WithdrawalRequest' AND column_name = 'providerRef'
  ) THEN
    ALTER TABLE "WithdrawalRequest" RENAME COLUMN "flwTransferRef" TO "providerRef";
  END IF;
END $$;
ALTER TABLE "WithdrawalRequest"
  ADD COLUMN IF NOT EXISTS "providerRef" TEXT,
  ADD COLUMN IF NOT EXISTS "originatorConversationId" TEXT,
  ADD COLUMN IF NOT EXISTS "conversationId" TEXT,
  ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "WithdrawalRequest_originatorConversationId_key" ON "WithdrawalRequest"("originatorConversationId");
CREATE UNIQUE INDEX IF NOT EXISTS "WithdrawalRequest_conversationId_key" ON "WithdrawalRequest"("conversationId");
CREATE UNIQUE INDEX IF NOT EXISTS "WithdrawalRequest_idempotencyKey_key" ON "WithdrawalRequest"("idempotencyKey");

CREATE TABLE IF NOT EXISTS "Wallet" (
  "id" TEXT NOT NULL,
  "ownerType" "WalletOwnerType" NOT NULL,
  "ownerId" TEXT NOT NULL,
  "currency" "Currency" NOT NULL,
  "pendingMinor" BIGINT NOT NULL DEFAULT 0,
  "availableMinor" BIGINT NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Wallet_ownerType_ownerId_currency_key" ON "Wallet"("ownerType", "ownerId", "currency");

CREATE TABLE IF NOT EXISTS "LedgerTransaction" (
  "id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LedgerTransaction_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LedgerTransaction_reference_key" ON "LedgerTransaction"("reference");

CREATE TABLE IF NOT EXISTS "LedgerEntry" (
  "id" TEXT NOT NULL,
  "txId" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "bucket" "BalanceBucket" NOT NULL,
  "amountMinor" BIGINT NOT NULL,
  "currency" "Currency" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LedgerEntry_walletId_createdAt_idx" ON "LedgerEntry"("walletId", "createdAt");
CREATE INDEX IF NOT EXISTS "LedgerEntry_txId_idx" ON "LedgerEntry"("txId");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LedgerEntry_txId_fkey') THEN
    ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_txId_fkey"
      FOREIGN KEY ("txId") REFERENCES "LedgerTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LedgerEntry_walletId_fkey') THEN
    ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_walletId_fkey"
      FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Payment" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "rail" "PaymentRail" NOT NULL,
  "currency" "Currency" NOT NULL,
  "grossMinor" BIGINT NOT NULL,
  "organiserNetMinor" BIGINT NOT NULL,
  "platformFeeMinor" BIGINT NOT NULL,
  "processorFeeMinor" BIGINT NOT NULL DEFAULT 0,
  "platformNetMinor" BIGINT NOT NULL DEFAULT 0,
  "organiserOwnerId" TEXT NOT NULL,
  "recipientAddress" TEXT,
  "chainOrderId" TEXT,
  "providerRef" TEXT,
  "checkoutRequestId" TEXT,
  "merchantRequestId" TEXT,
  "stkRequestStartedAt" TIMESTAMP(3),
  "status" "PaymentStatus" NOT NULL DEFAULT 'INITIATED',
  "releaseAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "checkoutRequestId" TEXT,
  ADD COLUMN IF NOT EXISTS "merchantRequestId" TEXT,
  ADD COLUMN IF NOT EXISTS "stkRequestStartedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_orderId_key" ON "Payment"("orderId");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_chainOrderId_key" ON "Payment"("chainOrderId");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_providerRef_key" ON "Payment"("providerRef");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_checkoutRequestId_key" ON "Payment"("checkoutRequestId");
CREATE INDEX IF NOT EXISTS "Payment_status_releaseAt_idx" ON "Payment"("status", "releaseAt");

CREATE TABLE IF NOT EXISTS "Payout" (
  "id" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "currency" "Currency" NOT NULL,
  "amountMinor" BIGINT NOT NULL,
  "method" "PayoutMethod" NOT NULL,
  "destination" TEXT NOT NULL,
  "status" "PayoutStatus" NOT NULL DEFAULT 'REQUESTED',
  "providerRef" TEXT,
  "originatorConversationId" TEXT,
  "conversationId" TEXT,
  "failureReason" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Payout"
  ADD COLUMN IF NOT EXISTS "originatorConversationId" TEXT,
  ADD COLUMN IF NOT EXISTS "conversationId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Payout_originatorConversationId_key" ON "Payout"("originatorConversationId");
CREATE UNIQUE INDEX IF NOT EXISTS "Payout_conversationId_key" ON "Payout"("conversationId");
CREATE UNIQUE INDEX IF NOT EXISTS "Payout_idempotencyKey_key" ON "Payout"("idempotencyKey");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Payout_walletId_fkey') THEN
    ALTER TABLE "Payout" ADD CONSTRAINT "Payout_walletId_fkey"
      FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ChainCursor" (
  "id" TEXT NOT NULL,
  "lastBlock" BIGINT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ChainCursor_pkey" PRIMARY KEY ("id")
);
