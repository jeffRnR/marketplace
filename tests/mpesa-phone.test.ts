import assert from "node:assert/strict";
import test from "node:test";
import { normalizeMpesaPhone } from "../lib/mpesaPhone";

test("normalizes a local 07 M-Pesa number", () => {
  assert.equal(normalizeMpesaPhone("0712 345 678"), "254712345678");
});

test("normalizes a local 01 M-Pesa number", () => {
  assert.equal(normalizeMpesaPhone("0112-345-678"), "254112345678");
});

test("accepts international and national-prefix-free Kenyan numbers", () => {
  assert.equal(normalizeMpesaPhone("+254 712 345 678"), "254712345678");
  assert.equal(normalizeMpesaPhone("712345678"), "254712345678");
});

test("rejects invalid lengths and unsupported prefixes", () => {
  assert.equal(normalizeMpesaPhone("071234567"), null);
  assert.equal(normalizeMpesaPhone("0312345678"), null);
  assert.equal(normalizeMpesaPhone("not a number"), null);
  assert.equal(normalizeMpesaPhone("0712345678abc"), null);
});