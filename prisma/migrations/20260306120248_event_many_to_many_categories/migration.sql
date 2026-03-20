-- Step 1: Create EventCategory join table FIRST
CREATE TABLE
  "EventCategory" (
    "eventId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    CONSTRAINT "EventCategory_pkey" PRIMARY KEY ("eventId", "categoryId")
  );

ALTER TABLE "EventCategory" ADD CONSTRAINT "EventCategory_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventCategory" ADD CONSTRAINT "EventCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 2: Copy existing data into join table BEFORE dropping the column
INSERT INTO
  "EventCategory" ("eventId", "categoryId")
SELECT
  "id",
  "categoryId"
FROM
  "Event"
WHERE
  "categoryId" IS NOT NULL;

-- Step 3: Now safe to drop the old constraint and column
ALTER TABLE "Event"
DROP CONSTRAINT "Event_categoryId_fkey";

ALTER TABLE "Event"
DROP COLUMN "categoryId";

-- Step 4: Drop eventsCount from Category (Prisma manages this via _count now)
ALTER TABLE "Category"
DROP COLUMN "eventsCount";