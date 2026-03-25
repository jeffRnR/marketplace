// app/api/scan/send-link-email/route.ts
// Send scanner link email to team member

import { NextResponse } from "next/server";
import { sendScannerLinkEmail } from "@/lib/notifications";

export async function POST(req: Request) {
  try {
    const {
      to, scannerName, eventTitle, eventDate, eventLocation,
      stationName, scanUrl, expiresAt
    } = await req.json();

    if (!to || !scannerName || !eventTitle || !scanUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:4000";

    await sendScannerLinkEmail({
      to, scannerName, eventTitle, eventDate, eventLocation,
      stationName, scanUrl, expiresAt, baseUrl,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Send scanner email error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}