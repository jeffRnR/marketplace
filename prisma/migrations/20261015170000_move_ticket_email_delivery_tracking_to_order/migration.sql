ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "ticketEmailSentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "ticketEmailClaimedAt" TIMESTAMP(3);

UPDATE "Order" AS o
SET "ticketEmailSentAt" = p."ticketEmailSentAt"
FROM "PaymentRecord" AS p
WHERE p."orderId" = o."id"
  AND p."ticketEmailSentAt" IS NOT NULL
  AND o."ticketEmailSentAt" IS NULL;

ALTER TABLE "PaymentRecord"
  DROP COLUMN IF EXISTS "ticketEmailSentAt",
  DROP COLUMN IF EXISTS "ticketEmailClaimedAt";
