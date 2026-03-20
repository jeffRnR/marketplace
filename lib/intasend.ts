// lib/intasend.ts
// Typed IntaSend API client — replaces lib/flutterwave.ts entirely.
// Covers:
//   - M-Pesa STK Push (collect payment)
//   - Transaction status verification
//   - M-Pesa B2C payout (send money to vendor / owner)
//   - Webhook challenge verification
//
// Required env vars:
//   INTASEND_PUBLISHABLE_KEY   — ISPubKey_test_... or ISPubKey_live_...
//   INTASEND_SECRET_KEY        — ISSecretKey_test_... or ISSecretKey_live_...
//   INTASEND_WEBHOOK_CHALLENGE — any string you set in IntaSend dashboard → webhooks
//   INTASEND_TEST_MODE         — "true" for sandbox, "false" or unset for live

const BASE = () =>
  process.env.INTASEND_TEST_MODE === "true"
    ? "https://sandbox.intasend.com"
    : "https://payment.intasend.com";

function secretKey(): string {
  const k = process.env.INTASEND_SECRET_KEY;
  if (!k) throw new Error("INTASEND_SECRET_KEY env var is not set");
  return k;
}

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${secretKey()}`,
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StkPushParams {
  phone:       string;   // E.164 e.g. "254712345678" (no leading +)
  amount:      number;
  currency:    string;   // "KES"
  apiRef:      string;   // our idempotency key (UUID) → stored as api_ref
  narrative:   string;
  email:       string;
  firstName:   string;
  lastName:    string;
}

export interface StkPushResult {
  success:    boolean;
  invoiceId?: string;   // IntaSend's invoice_id — used for status checks
  message:    string;
  raw:        unknown;
}

export interface VerifyResult {
  success:  boolean;
  state:    "PENDING" | "PROCESSING" | "COMPLETE" | "FAILED";
  amount:   number;
  currency: string;
  apiRef:   string;
  invoiceId: string;
  failedReason: string | null;
  raw:      unknown;
}

export interface PayoutParams {
  phone:     string;   // "254712345678"
  amount:    number;
  name:      string;
  narrative: string;
}

export interface PayoutResult {
  success:    boolean;
  trackingId?: string;
  message:    string;
  raw:        unknown;
}

// ─── STK Push ─────────────────────────────────────────────────────────────────
// Sends M-Pesa payment prompt to customer's phone.
// Returns invoice_id which we store for status polling + webhook matching.

export async function initiateStkPush(p: StkPushParams): Promise<StkPushResult> {
  try {
    // IntaSend expects phone WITHOUT leading + — just "254..."
    const phone = p.phone.replace(/^\+/, "").replace(/\s/g, "");

    const res = await fetch(`${BASE()}/api/v1/payment/mpesa-stk-push/`, {
      method:  "POST",
      headers: headers(),
      body:    JSON.stringify({
        first_name:   p.firstName,
        last_name:    p.lastName,
        email:        p.email,
        host:         process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000",
        amount:       p.amount,
        phone_number: phone,
        api_ref:      p.apiRef,      // our UUID — echoed back in webhook
        currency:     p.currency,
        narrative:    p.narrative,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        message: data?.detail ?? data?.error ?? "STK push failed",
        raw:     data,
      };
    }

    return {
      success:   true,
      invoiceId: data.invoice?.invoice_id ?? data.invoice_id,
      message:   "STK push sent — customer will receive a payment prompt",
      raw:       data,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Network error",
      raw:     err,
    };
  }
}

// ─── Verify transaction status ────────────────────────────────────────────────
// Called from the webhook handler to re-confirm payment state.
// IntaSend: POST /api/v1/payment/status/ with { invoice_id }

export async function verifyTransaction(invoiceId: string): Promise<VerifyResult> {
  try {
    const res = await fetch(`${BASE()}/api/v1/payment/status/`, {
      method:  "POST",
      headers: headers(),
      body:    JSON.stringify({ invoice_id: invoiceId }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success:      false,
        state:        "FAILED",
        amount:       0,
        currency:     "",
        apiRef:       "",
        invoiceId,
        failedReason: data?.detail ?? "Verification failed",
        raw:          data,
      };
    }

    const state = (data.invoice?.state ?? data.state ?? "FAILED").toUpperCase() as VerifyResult["state"];

    return {
      success:      true,
      state,
      amount:       Number(data.invoice?.value ?? data.value ?? 0),
      currency:     data.invoice?.currency ?? data.currency ?? "KES",
      apiRef:       data.invoice?.api_ref  ?? data.api_ref  ?? "",
      invoiceId:    data.invoice?.invoice_id ?? invoiceId,
      failedReason: data.invoice?.failed_reason ?? data.failed_reason ?? null,
      raw:          data,
    };
  } catch (err: unknown) {
    return {
      success:      false,
      state:        "FAILED",
      amount:       0,
      currency:     "",
      apiRef:       "",
      invoiceId,
      failedReason: err instanceof Error ? err.message : "Network error",
      raw:          err,
    };
  }
}

// ─── M-Pesa B2C payout ────────────────────────────────────────────────────────
// Sends money from your IntaSend account to a vendor/owner's M-Pesa number.
// IntaSend B2C is a two-step process: initiate → approve.
// We set requires_approval = "NO" for fully automated payouts.
//
// NOTE: Your IntaSend account must have sufficient balance.
// Funds from ticket/vending sales settle into your IntaSend wallet automatically.

export async function initiateB2CPayout(p: PayoutParams): Promise<PayoutResult> {
  try {
    const phone = p.phone.replace(/^\+/, "").replace(/\s/g, "");

    // Step 1: Initiate
    const initiateRes = await fetch(`${BASE()}/api/v1/send-money/initiate/`, {
      method:  "POST",
      headers: headers(),
      body:    JSON.stringify({
        currency:         "KES",
        requires_approval: "NO",   // auto-approve — no manual step needed
        transactions: [
          {
            name:      p.name,
            account:   phone,
            amount:    p.amount,
            narrative: p.narrative,
          },
        ],
      }),
    });

    const initiateData = await initiateRes.json();

    if (!initiateRes.ok) {
      return {
        success: false,
        message: initiateData?.detail ?? initiateData?.message ?? "Payout initiation failed",
        raw:     initiateData,
      };
    }

    // Step 2: Approve (required even with requires_approval=NO for the API flow)
    const approveRes = await fetch(`${BASE()}/api/v1/send-money/approve/`, {
      method:  "POST",
      headers: headers(),
      body:    JSON.stringify({ tracking_id: initiateData.tracking_id }),
    });

    const approveData = await approveRes.json();

    if (!approveRes.ok) {
      return {
        success: false,
        message: approveData?.detail ?? "Payout approval failed",
        raw:     approveData,
      };
    }

    return {
      success:    true,
      trackingId: initiateData.tracking_id,
      message:    "Payout initiated and approved",
      raw:        approveData,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Network error",
      raw:     err,
    };
  }
}

// ─── Webhook challenge verification ──────────────────────────────────────────
// IntaSend sends a "challenge" field in the webhook payload body.
// You set this challenge string in your IntaSend dashboard → Webhooks.
// Compare it against your INTASEND_WEBHOOK_CHALLENGE env var.
// Constant-time comparison to prevent timing attacks.

export function verifyWebhookChallenge(payloadChallenge: string | null | undefined): boolean {
  const expected = process.env.INTASEND_WEBHOOK_CHALLENGE;
  if (!expected || !payloadChallenge) return false;
  if (payloadChallenge.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < payloadChallenge.length; i++) {
    diff |= payloadChallenge.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}