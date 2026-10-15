import assert from "node:assert/strict";
import test from "node:test";
import { computeSplit, toMinor } from "@/lib/money";
import { resolveRoute } from "@/lib/payments/routing";
import { buildStkPassword, darajaTimestamp } from "@/lib/daraja";
import { PAYMENT_CONFIRMATION_TIMEOUT_MS } from "@/lib/paymentTiming";
import {
  isEventAccentColor,
  isEventPageLayout,
  isEventTicketStyle,
  isEventTicketTheme,
  safeEventTicketTheme,
  safeEventAccentColor,
} from "@/lib/eventAppearance";

test("fees are computed with KES base plus a 5% platform fee", () => {
  const split = computeSplit(toMinor("1000.00", "KES"), "KES");
  assert.equal(split.organiserNetMinor.toString(), "100000");
  assert.equal(split.platformFeeMinor.toString(), "8000");
  assert.equal(split.grossMinor.toString(), "108000");
});

test("USDC tickets route to native escrow when organiser is paid in USDC", () => {
  assert.equal(resolveRoute("USDC", "USDC"), "USDC_NATIVE");
  assert.equal(resolveRoute("KES", "KES"), "FIAT_NATIVE");
  assert.equal(resolveRoute("USDC", "KES"), "USDC_TO_FIAT_RAMP");
});

test("Daraja timestamp uses the required UTC yyyyMMddHHmmss format", () => {
  assert.equal(darajaTimestamp(new Date("2026-10-13T19:02:48.971Z")), "20261013190248");
});

test("STK password encodes shortcode, passkey, and timestamp", () => {
  assert.equal(
    buildStkPassword("123456", "test-passkey", "20261013190248"),
    Buffer.from("123456test-passkey20261013190248").toString("base64"),
  );
});

test("M-Pesa checkout stops actively waiting after one minute", () => {
  assert.equal(PAYMENT_CONFIRMATION_TIMEOUT_MS, 60_000);
});

test("event appearance settings accept only supported layouts and hex colours", () => {
  assert.equal(isEventAccentColor("#AABBCC"), true);
  assert.equal(isEventAccentColor("red; background:url(javascript:alert(1))"), false);
  assert.equal(isEventPageLayout("immersive"), true);
  assert.equal(isEventPageLayout("custom-html"), false);
  assert.equal(isEventTicketStyle("minimal"), true);
  assert.equal(isEventTicketStyle("custom-html"), false);
  assert.equal(isEventTicketTheme("forest"), true);
  assert.equal(isEventTicketTheme("custom-html"), false);
  assert.equal(safeEventTicketTheme("invalid"), "midnight");
  assert.equal(safeEventAccentColor("invalid"), "#7c3aed");
});
