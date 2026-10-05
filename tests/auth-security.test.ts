import assert from "node:assert/strict";
import test from "node:test";
import { getPasswordPolicyError } from "../lib/passwordPolicy";

test("accepts a long passphrase without requiring character classes", () => {
  assert.equal(getPasswordPolicyError("correct horse battery"), null);
});

test("rejects passphrases shorter than 15 characters", () => {
  assert.equal(
    getPasswordPolicyError("short phrase"),
    "Use a passphrase with at least 15 characters.",
  );
});

test("rejects passwords exceeding bcrypt's 72-byte limit", () => {
  assert.equal(getPasswordPolicyError("😀".repeat(19)), "Password must be no more than 72 bytes.");
});

test("counts unicode code points for the minimum length", () => {
  assert.equal(getPasswordPolicyError("😀".repeat(15)), null);
});