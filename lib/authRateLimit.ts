import { createHmac } from "node:crypto";
import prisma from "@/lib/prisma";

function hashRateLimitKey(key: string): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required for authentication rate limiting");

  return createHmac("sha256", secret).update(key).digest("hex");
}

export async function consumeAuthAttempt(
  key: string,
  maxAttempts: number,
  windowSeconds: number,
): Promise<boolean> {
  const hashedKey = hashRateLimitKey(key);
  const rows = await prisma.$queryRaw<Array<{ attempts: number }>>`
    INSERT INTO "AuthRateLimit" AS stored ("key", "attempts", "windowStartedAt")
    VALUES (${hashedKey}, 1, NOW())
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE
        WHEN stored."windowStartedAt" <= NOW() - (${windowSeconds} * INTERVAL '1 second') THEN 1
        ELSE stored."attempts" + 1
      END,
      "windowStartedAt" = CASE
        WHEN stored."windowStartedAt" <= NOW() - (${windowSeconds} * INTERVAL '1 second') THEN NOW()
        ELSE stored."windowStartedAt"
      END
    RETURNING "attempts"
  `;

  if (Math.random() < 0.01) {
    const expiredBefore = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await prisma.authRateLimit
      .deleteMany({ where: { windowStartedAt: { lt: expiredBefore } } })
      .catch((error: unknown) => console.error("Auth rate-limit cleanup failed:", error));
  }

  return (rows[0]?.attempts ?? maxAttempts + 1) <= maxAttempts;
}

export async function clearAuthAttempts(key: string): Promise<void> {
  await prisma.authRateLimit.deleteMany({ where: { key: hashRateLimitKey(key) } });
}