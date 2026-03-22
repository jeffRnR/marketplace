import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function GET() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) return NextResponse.json({ error: "Missing GMAIL_USER or GMAIL_APP_PASSWORD" });

  const transporter = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });

  try {
    await transporter.verify();
    const info = await transporter.sendMail({
      from:    `"Test" <${user}>`,
      to:      user,
      subject: "Test email from platform",
      text:    "If you see this, email is working.",
    });
    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}