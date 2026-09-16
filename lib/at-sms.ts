import AfricasTalking from "africastalking";

type SmsClient = {
  SMS: {
    send(options: { to: string[]; message: string; senderId?: string; enqueue: boolean }): Promise<unknown>;
  };
};

function normalizePhone(phone: string): string {
  const value = phone.trim().replace(/[\s()-]/g, "");
  if (value.startsWith("+")) return value;
  if (value.startsWith("00")) return `+${value.slice(2)}`;
  if (value.startsWith("254")) return `+${value}`;
  if (value.startsWith("07") || value.startsWith("01")) return `+254${value.slice(1)}`;
  if (value.startsWith("7") || value.startsWith("1")) return `+254${value}`;
  return value;
}

export async function sendSMS(to: string, message: string): Promise<void> {
  const phone = to ? normalizePhone(to) : "";
  if (!phone) return;

  const apiKey = process.env.AT_API_KEY;
  const username = process.env.AT_USERNAME;
  if (!apiKey || !username) {
    console.warn("SMS skipped: AT_API_KEY or AT_USERNAME is not configured");
    return;
  }

  try {
    const client = AfricasTalking({
      apiKey,
      username,
      environment: process.env.AT_ENVIRONMENT ?? "sandbox",
    }) as unknown as SmsClient;
    const options: { to: string[]; message: string; senderId?: string; enqueue: boolean } = {
      to: [phone],
      message,
      enqueue: true,
    };
    if (process.env.AT_SENDER_ID) options.senderId = process.env.AT_SENDER_ID;
    await client.SMS.send(options);
    console.log(`SMS queued for ${phone}`);
  } catch (error) {
    console.error("SMS send failed:", error);
  }
}