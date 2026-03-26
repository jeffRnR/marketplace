// lib/ticketSigning.ts
// Signs and verifies ticket QR payloads using HMAC-SHA256.
// Add TICKET_SIGNING_SECRET to your .env — generate with:
//   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.TICKET_SIGNING_SECRET ?? "";

if (!SECRET && process.env.NODE_ENV === "production") {
  throw new Error("TICKET_SIGNING_SECRET must be set in production.");
}

export interface SignedPayload {
  code:      string; // ticketCode
  eventId:   number;
  issuedAt:  number; // unix ms
  signature: string;
}

/** Encode a signed payload into a compact string for QR encoding */
export function signTicket(ticketCode: string, eventId: number): string {
  const issuedAt = Date.now();
  const data     = `${ticketCode}:${eventId}:${issuedAt}`;
  const sig      = createHmac("sha256", SECRET).update(data).digest("hex");
  // Compact format: base64url of JSON
  const payload: SignedPayload = { code: ticketCode, eventId, issuedAt, signature: sig };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

/** Verify a scanned QR string. Returns ticketCode + eventId or throws. */
export function verifyTicketSignature(
  raw: string,
): { ticketCode: string; eventId: number } {
  let payload: SignedPayload;
  try {
    payload = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  } catch {
    throw new Error("INVALID_FORMAT");
  }

  const { code, eventId, issuedAt, signature } = payload;
  if (!code || !eventId || !issuedAt || !signature) throw new Error("INVALID_FORMAT");

  const data     = `${code}:${eventId}:${issuedAt}`;
  const expected = createHmac("sha256", SECRET).update(data).digest("hex");

  // Timing-safe comparison to prevent timing attacks
  const sigBuf = Buffer.from(signature, "hex");
  const expBuf = Buffer.from(expected,  "hex");
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    throw new Error("INVALID_SIGNATURE");
  }

  return { ticketCode: code, eventId };
}