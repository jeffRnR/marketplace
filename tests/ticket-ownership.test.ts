import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMyTicketsWhere,
  normalizeAccountEmail,
  resolveOrderOwnerId,
} from "../lib/ticketOwnership";

test("normalizes account emails before lookup", () => {
  assert.equal(normalizeAccountEmail("  Buyer@Example.COM  "), "buyer@example.com");
  assert.equal(normalizeAccountEmail("   "), null);
  assert.equal(normalizeAccountEmail(null), null);
});

test("resolves the signed-in user id from the session email", async () => {
  let lookedUpEmail = "";
  const ownerId = await resolveOrderOwnerId(" Buyer@Example.COM ", async (email) => {
    lookedUpEmail = email;
    return { id: "user-123" };
  });

  assert.equal(lookedUpEmail, "buyer@example.com");
  assert.equal(ownerId, "user-123");
});

test("does not look up an account when no session email exists", async () => {
  let lookupCalled = false;
  const ownerId = await resolveOrderOwnerId(null, async () => {
    lookupCalled = true;
    return { id: "unexpected" };
  });

  assert.equal(ownerId, null);
  assert.equal(lookupCalled, false);
});

test("My Tickets includes confirmed orders linked by account or legacy email", () => {
  assert.deepEqual(buildMyTicketsWhere("user-123", " Buyer@Example.COM "), {
    status: "confirmed",
    OR: [{ userId: "user-123" }, { email: "buyer@example.com" }],
  });
});

test("My Tickets never includes unconfirmed orders", () => {
  assert.equal(buildMyTicketsWhere("user-123", "buyer@example.com").status, "confirmed");
});