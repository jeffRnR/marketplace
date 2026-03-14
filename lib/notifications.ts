// lib/notifications.ts
// Shared email (Resend) and SMS (Africa's Talking) helpers.
// Used by both the checkout route (RSVP) and the payment webhook (paid tickets + vending).

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// ─── SMS via Africa's Talking ─────────────────────────────────────────────────

export async function sendSMS(phone: string, message: string): Promise<void> {
  const username = process.env.AT_USERNAME;
  const apiKey   = process.env.AT_API_KEY;
  const from     = process.env.AT_SENDER_ID ?? "PLATFORM";

  if (!username || !apiKey) {
    console.warn("⚠️  SMS skipped: AT_USERNAME or AT_API_KEY not set");
    return;
  }

  try {
    const res = await fetch("https://api.africastalking.com/version1/messaging", {
      method:  "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "apiKey":        apiKey,
        "Accept":        "application/json",
      },
      body: new URLSearchParams({ username, to: phone, message, from }).toString(),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("❌ SMS API error:", JSON.stringify(data));
    } else {
      console.log("✅ SMS sent:", JSON.stringify(data?.SMSMessageData?.Recipients ?? data));
    }
  } catch (err) {
    console.error("❌ SMS exception:", err);
  }
}

// ─── Ticket confirmation email ────────────────────────────────────────────────

export interface TicketEmailItem {
  ticketType: string;
  quantity:   number;
  price:      string;
  ticketCode: string;
}

export async function sendTicketEmail({
  to, name, eventTitle, eventDate, eventLocation,
  items, totalAmount, isRsvp, orderId, baseUrl,
}: {
  to:            string;
  name:          string;
  eventTitle:    string;
  eventDate:     string;
  eventLocation: string;
  items:         TicketEmailItem[];
  totalAmount:   number;
  isRsvp:        boolean;
  orderId:       string;
  baseUrl:       string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("⚠️  Email skipped: RESEND_API_KEY not set");
    return;
  }

  const ticketRows = items.map((item) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #2d2d2d;">
        <strong style="color:#e2e8f0;">${item.ticketType}</strong><br/>
        <span style="color:#718096;font-size:13px;">Qty: ${item.quantity} · ${isRsvp ? "Free RSVP" : item.price}</span>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #2d2d2d;text-align:right;vertical-align:top;">
        <a href="${baseUrl}/ticket/${item.ticketCode}"
           style="background:#7c3aed;color:#fff;padding:6px 14px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;">
          View Ticket
        </a>
      </td>
    </tr>
  `).join("");

  const allTicketLinks = items.map((item) =>
    `<p style="margin:4px 0;"><a href="${baseUrl}/ticket/${item.ticketCode}" style="color:#a78bfa;">${baseUrl}/ticket/${item.ticketCode}</a></p>`
  ).join("");

  try {
    const result = await resend.emails.send({
      from:    process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
      to,
      subject: `Your ticket for ${eventTitle} 🎟`,
      html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:system-ui,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid #2d2d4e;">
    <div style="background:linear-gradient(135deg,#4c1d95,#7c3aed);padding:32px;text-align:center;">
      <p style="color:#ddd6fe;font-size:13px;margin:0 0 8px;">YOUR TICKET</p>
      <h1 style="color:#fff;margin:0;font-size:26px;">${eventTitle}</h1>
    </div>
    <div style="padding:28px;">
      <p style="color:#a0aec0;margin:0 0 20px;">Hi <strong style="color:#e2e8f0;">${name}</strong>, your ${isRsvp ? "RSVP" : "order"} is confirmed!</p>
      <div style="background:#111827;border-radius:12px;padding:16px;margin-bottom:20px;">
        <p style="color:#718096;font-size:12px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;">Event Details</p>
        <p style="color:#e2e8f0;margin:4px 0;">📅 ${eventDate}</p>
        <p style="color:#e2e8f0;margin:4px 0;">📍 ${eventLocation}</p>
      </div>
      <p style="color:#718096;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">Your Tickets</p>
      <table style="width:100%;border-collapse:collapse;">${ticketRows}</table>
      ${!isRsvp ? `
      <div style="background:#111827;border-radius:12px;padding:16px;margin-top:20px;text-align:right;">
        <span style="color:#718096;">Total paid: </span>
        <strong style="color:#68d391;font-size:18px;">KES ${totalAmount.toLocaleString()}</strong>
      </div>` : ""}
      <div style="margin-top:24px;padding-top:20px;border-top:1px solid #2d2d2d;">
        <p style="color:#718096;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">Ticket Links</p>
        ${allTicketLinks}
      </div>
      <p style="color:#4a5568;font-size:12px;margin-top:24px;text-align:center;">
        Present your ticket QR code at the entrance.<br/>Order ID: ${orderId}
      </p>
    </div>
  </div>
</body>
</html>`,
    });

    if (result.error) {
      console.error("❌ Resend error:", JSON.stringify(result.error));
    } else {
      console.log("✅ Ticket email sent:", result.data?.id);
    }
  } catch (err) {
    console.error("❌ Email exception:", err);
  }
}

// ─── Vending slot confirmation email ─────────────────────────────────────────

export async function sendVendingConfirmationEmail({
  to, name, eventTitle, eventDate, eventLocation,
  slotTitle, amount, applicationId, baseUrl,
}: {
  to:              string;
  name:            string;
  eventTitle:      string;
  eventDate:       string;
  eventLocation:   string;
  slotTitle:       string;
  amount:          number;
  applicationId:   string;
  baseUrl:         string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("⚠️  Email skipped: RESEND_API_KEY not set");
    return;
  }

  try {
    const result = await resend.emails.send({
      from:    process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
      to,
      subject: `Vending slot confirmed — ${eventTitle} 🛒`,
      html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:system-ui,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid #2d2d4e;">
    <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:32px;text-align:center;">
      <p style="color:#bfdbfe;font-size:13px;margin:0 0 8px;">VENDING SLOT CONFIRMED</p>
      <h1 style="color:#fff;margin:0;font-size:24px;">${eventTitle}</h1>
    </div>
    <div style="padding:28px;">
      <p style="color:#a0aec0;margin:0 0 20px;">Hi <strong style="color:#e2e8f0;">${name}</strong>, your vending slot is booked!</p>
      <div style="background:#111827;border-radius:12px;padding:16px;margin-bottom:20px;">
        <p style="color:#718096;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">Booking Details</p>
        <p style="color:#e2e8f0;margin:4px 0;">🛒 Slot: <strong>${slotTitle}</strong></p>
        <p style="color:#e2e8f0;margin:4px 0;">📅 ${eventDate}</p>
        <p style="color:#e2e8f0;margin:4px 0;">📍 ${eventLocation}</p>
        <p style="color:#68d391;margin:12px 0 0;font-size:16px;font-weight:bold;">KES ${amount.toLocaleString()} paid</p>
      </div>
      <p style="color:#4a5568;font-size:12px;text-align:center;">
        Reference: ${applicationId.slice(0, 8).toUpperCase()}<br/>
        The event organizer will contact you with further details.
      </p>
    </div>
  </div>
</body>
</html>`,
    });

    if (result.error) {
      console.error("❌ Resend vending email error:", JSON.stringify(result.error));
    } else {
      console.log("✅ Vending confirmation email sent:", result.data?.id);
    }
  } catch (err) {
    console.error("❌ Vending email exception:", err);
  }
}