ALTER TABLE "PromoCode" ADD COLUMN "expiresAt" TIMESTAMP(3);

CREATE TABLE "EventReminder" (
  "id" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "eventId" INTEGER NOT NULL,
  "orderId" TEXT NOT NULL,
  CONSTRAINT "EventReminder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventReminder_eventId_orderId_key" ON "EventReminder"("eventId", "orderId");
CREATE INDEX "EventReminder_eventId_idx" ON "EventReminder"("eventId");

ALTER TABLE "EventReminder" ADD CONSTRAINT "EventReminder_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventReminder" ADD CONSTRAINT "EventReminder_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
