// lib/encryption.ts
// AES-256-GCM encryption for sensitive payout details stored in the DB.
// Key must be 64 hex characters (32 bytes) — generate with: openssl rand -hex 32
// Store as ENCRYPTION_KEY in .env

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALG        = "aes-256-gcm";
const IV_BYTES   = 12;  // 96-bit IV recommended for GCM
const TAG_BYTES  = 16;

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY env var must be set to exactly 64 hex characters. " +
      "Generate with: openssl rand -hex 32"
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypt an object to a base64 string.
 * Format: base64(iv + authTag + ciphertext)
 */
export function encrypt(data: Record<string, unknown>): string {
  const key        = getKey();
  const iv         = randomBytes(IV_BYTES);
  const cipher     = createCipheriv(ALG, key, iv);
  const plaintext  = JSON.stringify(data);
  const encrypted  = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag    = cipher.getAuthTag();
  // Pack: iv (12) + authTag (16) + ciphertext
  const packed = Buffer.concat([iv, authTag, encrypted]);
  return packed.toString("base64");
}

/**
 * Decrypt a base64 string back to the original object.
 */
export function decrypt<T = Record<string, unknown>>(encoded: string): T {
  const key    = getKey();
  const packed = Buffer.from(encoded, "base64");

  const iv         = packed.subarray(0, IV_BYTES);
  const authTag    = packed.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = packed.subarray(IV_BYTES + TAG_BYTES);

  const decipher = createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8")) as T;
}