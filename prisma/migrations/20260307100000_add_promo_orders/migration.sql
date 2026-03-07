-- Migration: add-promo-codes-orders
-- Create folder: prisma/migrations/20260307100000_add_promo_orders/migration.sql

-- PromoCode table
CREATE TABLE "PromoCode" (
  "id"        TEXT        NOT NULL,
  "eventId"   INTEGER     NOT NULL,
  "code"      TEXT        NOT NULL,
  "discount"  TEXT        NOT NULL,
  "maxUses"   INTEGER     NOT NULL DEFAULT 50,
  "uses"      INTEGER     NOT NULL DEFAULT 0,
  "active"    BOOLEAN     NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PromoCode_eventId_code_key" ON "PromoCode"("eventId", "code");
ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Order table
CREATE TABLE "Order" (
  "id"          TEXT         NOT NULL,
  "eventId"     INTEGER      NOT NULL,
  "email"       TEXT         NOT NULL,
  "phone"       TEXT         NOT NULL,
  "name"        TEXT         NOT NULL,
  "promoCode"   TEXT,
  "discount"    TEXT,
  "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "isRsvp"      BOOLEAN      NOT NULL DEFAULT false,
  "status"      TEXT         NOT NULL DEFAULT 'confirmed',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Order" ADD CONSTRAINT "Order_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- OrderItem table (one row per ticket type per order)
CREATE TABLE "OrderItem" (
  "id"         TEXT    NOT NULL,
  "orderId"    TEXT    NOT NULL,
  "ticketId"   INTEGER NOT NULL,
  "ticketType" TEXT    NOT NULL,
  "price"      TEXT    NOT NULL,
  "quantity"   INTEGER NOT NULL DEFAULT 1,
  "ticketCode" TEXT    NOT NULL,
  CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OrderItem_ticketCode_key" ON "OrderItem"("ticketCode");
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;