// lib/notifications.ts
// Transactional email via Resend SMTP or Gmail SMTP.
// SMS via Africa's Talking sandbox

import nodemailer from "nodemailer";
import QRCode from "qrcode";
import { signTicket } from "@/lib/ticketSigning";
import { safeEventAccentColor } from "@/lib/eventAppearance";
export { sendSMS } from "@/lib/at-sms";

// ─── Gmail transporter ────────────────────────────────────────────────────────

function getTransporter() {
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFromEmail = process.env.RESEND_FROM_EMAIL;
  if (resendApiKey && resendFromEmail) {
    const senderDomain = resendFromEmail.split("@").pop()?.toLowerCase();
    if (process.env.NODE_ENV === "production" && senderDomain === "resend.dev") {
      throw new Error("Production ticket email requires a sender address on your verified domain, not resend.dev");
    }
    return nodemailer.createTransport({
      host: "smtp.resend.com",
      port: 465,
      secure: true,
      auth: { user: "resend", pass: resendApiKey },
    });
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Production ticket email requires Resend credentials and a verified sender domain");
  }

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (user && pass) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }

  return null;
}

function getFromAddress() {
  return process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL
    ? process.env.RESEND_FROM_EMAIL
    : process.env.GMAIL_USER;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

// ─── Ticket confirmation email ────────────────────────────────────────────────

export interface TicketEmailItem {
  ticketType: string;
  quantity: number;
  price: string;
  ticketCode: string;
  eventId: string;
  accentColor: string;
  ticketStyle: "classic" | "minimal";
}

export async function sendTicketEmail({
  to,
  name,
  eventTitle,
  eventDate,
  eventLocation,
  items,
  totalAmount,
  isRsvp,
  orderId,
  baseUrl,
}: {
  to: string;
  name: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  items: TicketEmailItem[];
  totalAmount: number;
  isRsvp: boolean;
  orderId: string;
  baseUrl: string;
}): Promise<void> {
  const transporter = getTransporter();
  const fromAddress = getFromAddress();
  if (!transporter || !fromAddress) {
    throw new Error("Ticket email is not configured; set RESEND_API_KEY and RESEND_FROM_EMAIL or Gmail SMTP credentials");
  }

  const safeBaseUrl = baseUrl.replace(/\/+$/, "");
  const attachmentGroups = await Promise.all(items.map(async (item) => {
    const qrPng = await QRCode.toBuffer(
      signTicket(item.ticketCode, item.eventId),
      { width: 320, margin: 2, color: { dark: "#111827", light: "#ffffff" } },
    );
    return [
      {
        filename: `ticket-${item.ticketCode}-qr.png`,
        content: qrPng,
        contentType: "image/png",
        cid: `ticket-${item.ticketCode}`,
        contentDisposition: "inline" as const,
      },
      {
        filename: `ticket-${item.ticketCode}.png`,
        content: qrPng,
        contentType: "image/png",
        contentDisposition: "attachment" as const,
      },
    ];
  }));
  const attachments = attachmentGroups.flat();
  const accentColor = safeEventAccentColor(items[0]?.accentColor);
  const ticketShape = items[0]?.ticketStyle === "minimal" ? "4px" : "12px";

  const ticketRows = items
    .map((item) => {
      const ticketUrl = `${safeBaseUrl}/ticket/${encodeURIComponent(item.ticketCode)}`;
      return `
    <tr>
      <td style="padding:18px 0;border-bottom:1px solid #e5e7eb;">
        <table role="presentation" style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="vertical-align:top;">
              <strong style="color:#111827;font-size:16px;">${escapeHtml(item.ticketType)}</strong><br/>
              <span style="color:#4b5563;font-size:13px;">
                Quantity: ${item.quantity} · ${isRsvp ? "Free RSVP" : escapeHtml(item.price)}
              </span><br/>
              <a href="${escapeHtml(ticketUrl)}" style="color:${accentColor};font-size:13px;text-decoration:underline;">
                Open ticket online
              </a>
            </td>
            <td style="width:150px;text-align:right;vertical-align:top;">
              <img src="cid:ticket-${escapeHtml(item.ticketCode)}" width="136" height="136"
                   alt="Scannable entry QR code for ${escapeHtml(item.ticketType)} ticket"
                   style="display:block;width:136px;height:136px;border:8px solid #fff;border-radius:${ticketShape};" />
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
    })
    .join("");

  const textTickets = items.map((item) =>
    `${item.ticketType} — ${item.quantity} ticket(s)\n${safeBaseUrl}/ticket/${encodeURIComponent(item.ticketCode)}`,
  ).join("\n\n");
  const safeEventTitle = escapeHtml(eventTitle);
  const safeName = escapeHtml(name);
  const safeEventDate = escapeHtml(eventDate);
  const safeEventLocation = escapeHtml(eventLocation);
  const safeOrderId = escapeHtml(orderId);

  try {
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME ?? "Noizy Hub"}" <${fromAddress}>`,
      to,
      subject: `Your ${isRsvp ? "RSVP" : "ticket"} for ${eventTitle}`,
      text: `Hi ${name},\n\nYour ${isRsvp ? "RSVP" : "ticket order"} for ${eventTitle} is confirmed.\n\nDate: ${eventDate}\nLocation: ${eventLocation}\n\nYour ticket QR code is included in this email. Show it directly from your inbox or download the attached PNG to save it to your device.\n\n${textTickets}\n\nOrder reference: ${orderId}\n\nNoizy Hub`,
      html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <div style="max-width:640px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:${accentColor};padding:28px 24px;text-align:center;">
      <p style="color:#ede9fe;font-size:12px;font-weight:bold;letter-spacing:2px;margin:0 0 8px;">NOIZY HUB · ENTRY PASS</p>
      <h1 style="color:#fff;margin:0;font-size:24px;line-height:1.3;">${safeEventTitle}</h1>
    </div>
    <div style="padding:24px;">
      <p style="color:#374151;margin:0 0 20px;">
        Hi <strong>${safeName}</strong>,
        your ${isRsvp ? "RSVP" : "order"} is confirmed!
      </p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:20px;">
        <p style="color:#6b7280;font-size:12px;font-weight:bold;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">Event details</p>
        <p style="color:#111827;margin:6px 0;"><strong>Date:</strong> ${safeEventDate}</p>
        <p style="color:#111827;margin:6px 0;"><strong>Venue:</strong> ${safeEventLocation}</p>
      </div>
      <p style="color:#374151;font-size:14px;font-weight:bold;margin:0 0 8px;">Your scannable ticket${items.length === 1 ? "" : "s"}</p>
      <p style="color:#6b7280;font-size:13px;line-height:1.5;margin:0 0 8px;">
        Show the QR code${items.length === 1 ? "" : "s"} below directly from this email at the entrance, or download the attached PNG${items.length === 1 ? "" : "files"} to save it to your device.
      </p>
      <table style="width:100%;border-collapse:collapse;">${ticketRows}</table>
      ${
        !isRsvp
          ? `
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-top:20px;text-align:right;">
        <span style="color:#4b5563;">Total paid: </span>
        <strong style="color:#15803d;font-size:18px;">
          KES ${totalAmount.toLocaleString()}
        </strong>
      </div>`
          : ""
      }
      <p style="color:#6b7280;font-size:12px;margin:22px 0 0;text-align:center;line-height:1.6;">
        Keep this email available when you arrive.<br/>Order reference: <strong style="color:#374151;">${safeOrderId}</strong>
      </p>
    </div>
    <div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;color:#6b7280;font-size:12px;">
      Sent by Noizy Hub · <a href="${escapeHtml(safeBaseUrl)}" style="color:${accentColor};">Visit Noizy Hub</a>
    </div>
  </div>
</body>
</html>`,
      attachments,
    });
    if (!info.accepted.some((recipient) => String(recipient).toLowerCase() === to.toLowerCase())) {
      throw new Error("Ticket email was not accepted by the configured mail server");
    }

    console.log("Ticket email sent", { messageId: info.messageId });
  } catch (err) {
    console.error("Ticket email delivery failed", err);
    throw err;
  }
}

// ─── Vending slot confirmation email ─────────────────────────────────────────

export async function sendVendingConfirmationEmail({
  to,
  name,
  eventTitle,
  eventDate,
  eventLocation,
  slotTitle,
  amount,
  applicationId,
  baseUrl,
}: {
  to: string;
  name: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  slotTitle: string;
  amount: number;
  applicationId: string;
  baseUrl: string;
}): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) return;

  try {
    const info = await transporter.sendMail({
      from: `"Noizy Hub" <${getFromAddress()}>`,
      to,
      subject: `Vending slot confirmed — ${eventTitle} 🛒`,
      html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:system-ui,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#1a1a2e;border-radius:16px;
              overflow:hidden;border:1px solid #2d2d4e;">
    <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:32px;text-align:center;">
      <p style="color:#bfdbfe;font-size:13px;margin:0 0 8px;">VENDING SLOT CONFIRMED</p>
      <h1 style="color:#fff;margin:0;font-size:24px;">${eventTitle}</h1>
    </div>
    <div style="padding:28px;">
      <p style="color:#a0aec0;margin:0 0 20px;">
        Hi <strong style="color:#e2e8f0;">${name}</strong>,
        your vending slot is booked!
      </p>
      <div style="background:#111827;border-radius:12px;padding:16px;margin-bottom:20px;">
        <p style="color:#718096;font-size:12px;margin:0 0 8px;
                  text-transform:uppercase;letter-spacing:1px;">Booking Details</p>
        <p style="color:#e2e8f0;margin:4px 0;">🛒 Slot: <strong>${slotTitle}</strong></p>
        <p style="color:#e2e8f0;margin:4px 0;">📅 ${eventDate}</p>
        <p style="color:#e2e8f0;margin:4px 0;">📍 ${eventLocation}</p>
        <p style="color:#68d391;margin:12px 0 0;font-size:16px;font-weight:bold;">
          KES ${amount.toLocaleString()} paid
        </p>
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

    console.log("✅ Vending confirmation email sent:", info.messageId);
  } catch (err) {
    console.error("❌ Vending email exception:", err);
  }
}

// ─── Generic booking email ────────────────────────────────────────────────────

export async function sendBookingEmail({
  to,
  subject,
  name,
  body,
  ctaUrl,
  ctaLabel,
}: {
  to: string;
  subject: string;
  name: string;
  body: string;
  ctaUrl: string;
  ctaLabel: string;
}): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) return;

  try {
    const info = await transporter.sendMail({
      from: `"Noizy Hub" <${getFromAddress()}>`,
      to,
      subject,
      html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:system-ui,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid #2d2d4e;">
    <div style="background:linear-gradient(135deg,#1e3a5f,#4c1d95);padding:28px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:20px;">${subject}</h1>
    </div>
    <div style="padding:28px;">
      <p style="color:#a0aec0;margin:0 0 16px;">Hi <strong style="color:#e2e8f0;">${name}</strong>,</p>
      <p style="color:#cbd5e0;line-height:1.7;margin:0 0 24px;">${body}</p>
      <a href="${ctaUrl}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:14px;">${ctaLabel}</a>
    </div>
  </div>
</body>
</html>`,
    });
    console.log("✅ Booking email sent:", info.messageId);
  } catch (err) {
    console.error("❌ Booking email error:", err);
  }
}

// ─── Scanner link email ───────────────────────────────────────────────────────

export async function sendScannerLinkEmail({
  to,
  scannerName,
  eventTitle,
  eventDate,
  eventLocation,
  stationName,
  scanUrl,
  expiresAt,
  baseUrl,
}: {
  to: string;
  scannerName: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  stationName: string;
  scanUrl: string;
  expiresAt: string;
  baseUrl: string;
}): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) return;

  const expiryDate = new Date(expiresAt).toLocaleString("en-KE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  try {
    const info = await transporter.sendMail({
      from: `"Noizy Hub" <${getFromAddress()}>`,
      to,
      subject: `Scanner access for ${eventTitle} 🎫`,
      html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:system-ui,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#1a1a2e;border-radius:16px;
              overflow:hidden;border:1px solid #2d2d4e;">
    <div style="background:linear-gradient(135deg,#4c1d95,#7c3aed);padding:32px;text-align:center;">
      <p style="color:#ddd6fe;font-size:13px;margin:0 0 8px;">SCANNER ACCESS</p>
      <h1 style="color:#fff;margin:0;font-size:24px;">${eventTitle}</h1>
    </div>
    <div style="padding:28px;">
      <p style="color:#a0aec0;margin:0 0 20px;">
        Hi <strong style="color:#e2e8f0;">${scannerName}</strong>,
        you've been assigned as a scanner for this event!
      </p>
      <div style="background:#111827;border-radius:12px;padding:16px;margin-bottom:20px;">
        <p style="color:#718096;font-size:12px;margin:0 0 8px;
                  text-transform:uppercase;letter-spacing:1px;">Your Assignment</p>
        <p style="color:#e2e8f0;margin:4px 0;">🎫 Station: <strong>${stationName}</strong></p>
        <p style="color:#e2e8f0;margin:4px 0;">📅 ${eventDate}</p>
        <p style="color:#e2e8f0;margin:4px 0;">📍 ${eventLocation}</p>
        <p style="color:#fbbf24;margin:12px 0 0;font-size:14px;">
          Expires: ${expiryDate}
        </p>
      </div>
      <div style="text-align:center;margin-bottom:20px;">
        <a href="${scanUrl}"
           style="display:inline-block;background:#7c3aed;color:#fff;padding:16px 32px;
                  border-radius:12px;text-decoration:none;font-weight:bold;font-size:16px;
                  box-shadow:0 4px 12px rgba(124,58,237,0.3);">
          🚀 Open Scanner App
        </a>
      </div>
      <p style="color:#718096;font-size:12px;margin:0 0 8px;
                text-transform:uppercase;letter-spacing:1px;">Direct Link</p>
      <p style="color:#a78bfa;font-size:14px;margin:4px 0;word-break:break-all;">
        ${scanUrl}
      </p>
      <p style="color:#4a5568;font-size:12px;margin-top:20px;text-align:center;">
        Use this link on your phone or tablet to scan tickets.<br/>
        No app installation required — works in any browser.
      </p>
    </div>
  </div>
</body>
</html>`,
    });

    console.log("✅ Scanner link email sent:", info.messageId);
  } catch (err) {
    console.error("❌ Scanner email exception:", err);
  }
}
