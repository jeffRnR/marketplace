-- Convert the remaining integer identifiers to string identifiers.
-- Existing values are preserved as text so deployed data remains addressable;
-- new records receive CUIDs from Prisma's @default(cuid()).

ALTER TABLE "EventCategory" DROP CONSTRAINT "EventCategory_eventId_fkey";
ALTER TABLE "EventCategory" DROP CONSTRAINT "EventCategory_categoryId_fkey";
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_eventId_fkey";
ALTER TABLE "TicketCapacity" DROP CONSTRAINT "TicketCapacity_eventId_fkey";
ALTER TABLE "PromoCode" DROP CONSTRAINT "PromoCode_eventId_fkey";
ALTER TABLE "Order" DROP CONSTRAINT "Order_eventId_fkey";
ALTER TABLE "EventReminder" DROP CONSTRAINT "EventReminder_eventId_fkey";
ALTER TABLE "VendingSlot" DROP CONSTRAINT "VendingSlot_eventId_fkey";
ALTER TABLE "VendorApplication" DROP CONSTRAINT "VendorApplication_eventId_fkey";
ALTER TABLE "ScanStation" DROP CONSTRAINT "ScanStation_eventId_fkey";
ALTER TABLE "RsvpTierPayment" DROP CONSTRAINT "RsvpTierPayment_eventId_fkey";

ALTER TABLE "Category" ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "Event" ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "EventCategory" ALTER COLUMN "eventId" TYPE TEXT USING "eventId"::text;
ALTER TABLE "EventCategory" ALTER COLUMN "categoryId" TYPE TEXT USING "categoryId"::text;
ALTER TABLE "Ticket" ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "Ticket" ALTER COLUMN "eventId" TYPE TEXT USING "eventId"::text;
ALTER TABLE "TicketCapacity" ALTER COLUMN "eventId" TYPE TEXT USING "eventId"::text;
ALTER TABLE "PromoCode" ALTER COLUMN "eventId" TYPE TEXT USING "eventId"::text;
ALTER TABLE "Order" ALTER COLUMN "eventId" TYPE TEXT USING "eventId"::text;
ALTER TABLE "EventReminder" ALTER COLUMN "eventId" TYPE TEXT USING "eventId"::text;
ALTER TABLE "OrderItem" ALTER COLUMN "ticketId" TYPE TEXT USING "ticketId"::text;
ALTER TABLE "VendingSlot" ALTER COLUMN "eventId" TYPE TEXT USING "eventId"::text;
ALTER TABLE "VendorApplication" ALTER COLUMN "eventId" TYPE TEXT USING "eventId"::text;
ALTER TABLE "ScanStation" ALTER COLUMN "eventId" TYPE TEXT USING "eventId"::text;
ALTER TABLE "RsvpTierPayment" ALTER COLUMN "eventId" TYPE TEXT USING "eventId"::text;

ALTER TABLE "EventCategory" ADD CONSTRAINT "EventCategory_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventCategory" ADD CONSTRAINT "EventCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketCapacity" ADD CONSTRAINT "TicketCapacity_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventReminder" ADD CONSTRAINT "EventReminder_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendingSlot" ADD CONSTRAINT "VendingSlot_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorApplication" ADD CONSTRAINT "VendorApplication_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScanStation" ADD CONSTRAINT "ScanStation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RsvpTierPayment" ADD CONSTRAINT "RsvpTierPayment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;