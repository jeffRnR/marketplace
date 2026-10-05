ALTER TABLE "Order" ADD COLUMN "userId" TEXT;

CREATE INDEX "Order_userId_idx" ON "Order"("userId");

ALTER TABLE "Order"
ADD CONSTRAINT "Order_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "Order" AS orders
SET "userId" = users."id"
FROM "User" AS users
WHERE LOWER(orders."email") = LOWER(users."email");