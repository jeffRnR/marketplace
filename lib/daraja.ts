import { normalizeMpesaPhone } from "@/lib/mpesaPhone";
import { fromMinor } from "@/lib/money";
import { constants, publicEncrypt } from "node:crypto";

export type DarajaEnvironment = "sandbox" | "live";

type DarajaConfig = {
  baseUrl: string;
  environment: DarajaEnvironment;
};

type TokenCache = { value: string; expiresAt: number };
let tokenCache: TokenCache | undefined;

function getConfig(): DarajaConfig {
  const environment = (process.env.DARAJA_ENVIRONMENT ?? "sandbox").toLowerCase();
  if (environment !== "sandbox" && environment !== "live") {
    throw new Error("DARAJA_ENVIRONMENT must be sandbox or live");
  }
  return {
    environment,
    baseUrl: environment === "live" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke",
  };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) throw new Error(`${name} env var is not set`);
  return value.trim();
}

function validateCallbackUrl(name: string, value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute URL`);
  }
  if (getConfig().environment === "live" && url.protocol !== "https:") {
    throw new Error(`${name} must use HTTPS in live mode`);
  }
}

export function assertStkPushConfigured() {
  requireEnv("DARAJA_CONSUMER_KEY");
  requireEnv("DARAJA_CONSUMER_SECRET");
  requireEnv("DARAJA_SHORTCODE");
  requireEnv("DARAJA_PASSKEY");
  const callbackUrl = requireEnv("DARAJA_CALLBACK_URL");
  validateCallbackUrl("DARAJA_CALLBACK_URL", callbackUrl);
}

export function assertB2CConfigured() {
  requireEnv("DARAJA_CONSUMER_KEY");
  requireEnv("DARAJA_CONSUMER_SECRET");
  requireEnv("DARAJA_B2C_SHORTCODE");
  requireEnv("DARAJA_CERTIFICATE");
  requireEnv("DARAJA_INITIATOR_PASSWORD");
  requireEnv("DARAJA_INITIATOR_NAME");
  validateCallbackUrl("DARAJA_QUEUE_TIMEOUT_URL", requireEnv("DARAJA_QUEUE_TIMEOUT_URL"));
  validateCallbackUrl("DARAJA_B2C_RESULT_URL", requireEnv("DARAJA_B2C_RESULT_URL"));
}

async function getToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) return tokenCache.value;

  const consumerKey = requireEnv("DARAJA_CONSUMER_KEY");
  const consumerSecret = requireEnv("DARAJA_CONSUMER_SECRET");
  const { baseUrl } = getConfig();
  const res = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")}`,
    },
    signal: AbortSignal.timeout(15_000),
  });

  const data = await res.json().catch(() => ({})) as { access_token?: string; errorMessage?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(data.errorMessage ?? `Daraja token request failed (${res.status})`);
  }
  const expiresIn = Math.max(60, Number((data as { expires_in?: string }).expires_in ?? 3600));
  tokenCache = { value: data.access_token, expiresAt: Date.now() + expiresIn * 1000 };
  return data.access_token;
}

export function darajaTimestamp(date = new Date()): string {
  return date.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
}

export function buildStkPassword(shortCode: string, passkey: string, timestamp: string): string {
  return Buffer.from(`${shortCode}${passkey}${timestamp}`).toString("base64");
}

function buildSecurityCredential(password: string, certificate: string): string {
  const key = certificate.replace(/\\n/g, "\n");
  return publicEncrypt(
    { key, padding: constants.RSA_PKCS1_PADDING },
    Buffer.from(password, "utf8"),
  ).toString("base64");
}

function kesAmount(amountMinor: bigint): number {
  const value = fromMinor(amountMinor, "KES");
  if (!/^\d+(?:\.00)?$/.test(value)) {
    throw new Error("Daraja supports whole-KES payments only; amount must not contain cents");
  }
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Invalid Daraja payment amount");
  return amount;
}

export async function darajaRequest<T>(path: string, payload: Record<string, unknown>, method = "POST"): Promise<T> {
  const token = await getToken();
  const { baseUrl } = getConfig();
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    ...(method === "GET" ? {} : { body: JSON.stringify(payload) }),
    signal: AbortSignal.timeout(20_000),
  });

  const data = await res.json().catch(() => ({})) as T & {
    errorMessage?: string;
    errorCode?: string;
    RequestID?: string;
    ResponseDescription?: string;
    ResponseCode?: string;
  };
  if (!res.ok) {
    const detail = data.errorMessage ?? data.ResponseDescription ?? `Daraja request failed (${res.status})`;
    throw Object.assign(new Error(detail), { status: res.status, code: data.errorCode, requestId: data.RequestID });
  }
  return data;
}

export async function createCheckout(args: {
  txRef: string;
  amountMinor: bigint;
  customer: { email: string; phone?: string; name?: string };
  redirectUrl: string;
  meta?: Record<string, string>;
}): Promise<string> {
  const result = await initiateStkPush({
    phone: args.customer.phone ?? "",
    amount: kesAmount(args.amountMinor),
    currency: "KES",
    apiRef: args.txRef,
    narrative: args.meta?.orderId ? `Order ${args.meta.orderId}` : args.txRef,
    email: args.customer.email,
    firstName: args.customer.name?.split(/\s+/)[0] ?? "Customer",
    lastName: args.customer.name?.split(/\s+/).slice(1).join(" ") || "Customer",
  });
  if (!result.success || !result.checkoutRequestId) throw new Error(result.message);
  return result.checkoutRequestId;
}

export interface StkPushResult {
  success: boolean;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  message: string;
  raw: unknown;
}

export async function initiateStkPush(args: {
  phone: string;
  amount: number;
  currency: string;
  apiRef: string;
  narrative: string;
  email: string;
  firstName: string;
  lastName: string;
}): Promise<StkPushResult> {
  try {
    assertStkPushConfigured();
    if (args.currency !== "KES") throw new Error("Daraja STK Push only supports KES");
    if (!Number.isSafeInteger(args.amount) || args.amount <= 0) {
      throw new Error("Daraja STK Push requires a positive whole-KES amount");
    }
    const normalizedPhone = normalizeMpesaPhone(args.phone);
    if (!normalizedPhone) throw new Error("A valid Kenyan M-Pesa number is required for STK push");

  const shortCode = requireEnv("DARAJA_SHORTCODE");
  const passkey = requireEnv("DARAJA_PASSKEY");
  const timestamp = darajaTimestamp();
  const callbackUrl = requireEnv("DARAJA_CALLBACK_URL");
  const payload = {
    BusinessShortCode: shortCode,
    Password: buildStkPassword(shortCode, passkey, timestamp),
    Timestamp: timestamp,
    TransactionType: process.env.DARAJA_TRANSACTION_TYPE ?? "CustomerPayBillOnline",
    Amount: args.amount,
    PartyA: normalizedPhone,
    PartyB: shortCode,
    PhoneNumber: normalizedPhone,
    CallBackURL: callbackUrl,
    AccountReference: args.apiRef.slice(0, 12),
    TransactionDesc: args.narrative.slice(0, 13),
  };

  const data = await darajaRequest<{ CheckoutRequestID?: string; ResponseDescription?: string; MerchantRequestID?: string }>(
    "/mpesa/stkpush/v1/processrequest",
    payload,
  );

    if (!data.CheckoutRequestID || !data.MerchantRequestID) {
      throw new Error(data.ResponseDescription ?? "Daraja STK request could not be created");
    }
    return {
      success: true,
      checkoutRequestId: data.CheckoutRequestID,
      merchantRequestId: data.MerchantRequestID,
      message: data.ResponseDescription ?? "STK push sent",
      raw: data,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Daraja STK request failed",
      raw: error,
    };
  }
}

export interface VerifiedTransaction {
  CheckoutRequestID: string;
  MerchantRequestID?: string;
  ResultCode?: number;
  ResultDesc: string;
  Amount?: number;
  TransactionDate?: string;
  PhoneNumber?: string;
}

export async function verifyTransaction(checkoutRequestId: string): Promise<VerifiedTransaction> {
  const shortCode = requireEnv("DARAJA_SHORTCODE");
  const passkey = requireEnv("DARAJA_PASSKEY");
  const timestamp = darajaTimestamp();
  const payload = {
    BusinessShortCode: shortCode,
    Password: buildStkPassword(shortCode, passkey, timestamp),
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId,
  };

  const data = await darajaRequest<{
    ResultCode?: number | string;
    ResultDesc?: string;
    CheckoutRequestID?: string;
    MerchantRequestID?: string;
    ResponseCode?: string;
    ResponseDescription?: string;
  }>(
    "/mpesa/stkpushquery/v1/query",
    payload,
  );

  if (data.CheckoutRequestID && data.CheckoutRequestID !== checkoutRequestId) {
    throw new Error("Daraja status query returned a different CheckoutRequestID");
  }
  if (data.ResponseCode && data.ResponseCode !== "0") {
    return {
      CheckoutRequestID: checkoutRequestId,
      MerchantRequestID: data.MerchantRequestID,
      ResultDesc: data.ResponseDescription ?? "Daraja has not returned a terminal payment result",
    };
  }
  const resultCode = data.ResultCode === undefined || data.ResultCode === "" ? undefined : Number(data.ResultCode);
  if (resultCode !== undefined && !Number.isFinite(resultCode)) {
    throw new Error(data.ResultDesc ?? "Daraja status query returned an invalid result code");
  }
  if (resultCode !== undefined && !data.CheckoutRequestID) {
    throw new Error("Daraja returned a terminal result without a CheckoutRequestID");
  }
  return {
    CheckoutRequestID: checkoutRequestId,
    MerchantRequestID: data.MerchantRequestID,
    ResultCode: resultCode,
    ResultDesc: data.ResultDesc ?? "Daraja status query",
  };
}

export async function createTransfer(args: { reference: string; amountMinor: bigint; phone: string; narration: string }) {
  assertB2CConfigured();
  const phone = normalizeMpesaPhone(args.phone);
  if (!phone) throw new Error("Invalid M-Pesa phone for payout");

  const shortCode = requireEnv("DARAJA_B2C_SHORTCODE");
  const certificate = requireEnv("DARAJA_CERTIFICATE");
  const initiatorPassword = requireEnv("DARAJA_INITIATOR_PASSWORD");
  const timeoutUrl = requireEnv("DARAJA_QUEUE_TIMEOUT_URL");
  const resultUrl = requireEnv("DARAJA_B2C_RESULT_URL");
  const payload = {
    InitiatorName: requireEnv("DARAJA_INITIATOR_NAME"),
    SecurityCredential: buildSecurityCredential(initiatorPassword, certificate),
    CommandID: "BusinessPayment",
    Amount: kesAmount(args.amountMinor),
    PartyA: shortCode,
    PartyB: phone,
    Remarks: args.narration,
    QueueTimeOutURL: timeoutUrl,
    ResultURL: resultUrl,
    Occasion: args.reference,
  };

  const data = await darajaRequest<{ ConversationID?: string; OriginatorConversationID?: string; ResponseCode?: string; ResponseDescription?: string }>(
    "/mpesa/b2c/v1/paymentrequest",
    payload,
  );

  if (data.ResponseCode !== "0") {
    throw new Error(data.ResponseDescription ?? "Daraja did not accept the B2C payout request");
  }
  if (!data.ConversationID || !data.OriginatorConversationID) {
    throw new Error(data.ResponseDescription ?? "Daraja B2C response did not include reconciliation identifiers");
  }
  return {
    providerRef: data.ConversationID,
    conversationId: data.ConversationID,
    originatorConversationId: data.OriginatorConversationID,
    status: "pending",
  };
}

export function resetDarajaTokenCacheForTests() {
  tokenCache = undefined;
}
