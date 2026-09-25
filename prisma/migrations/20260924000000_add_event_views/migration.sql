ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "pageViews" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "EventView" (
  "id"        TEXT NOT NULL,
  "eventId"   TEXT NOT NULL,
  "ref"       TEXT NOT NULL DEFAULT 'direct',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventView_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EventView_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "EventView_eventId_idx"  ON "EventView"("eventId");
CREATE INDEX IF NOT EXISTS "EventView_ref_idx"       ON "EventView"("ref");
CREATE INDEX IF NOT EXISTS "EventView_createdAt_idx" ON "EventView"("createdAt");
