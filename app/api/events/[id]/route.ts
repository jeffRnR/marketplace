// app/api/events/[id]/route.ts
// PATCH — update event details. Owner only.
//         Detects changes to date, time, or location and emails all ticket holders.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import nodemailer from "nodemailer";

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
}

async function sendUpdateEmail({
  to, name, eventTitle, changes, eventId, baseUrl,
}: {
  to: string; name: string; eventTitle: string;
  changes: { field: string; from: string; to: string }[];
  eventId: number; baseUrl: string;
}) {
  const transporter = getTransporter();
  if (!transporter) return;

  const changeRows = changes.map(c => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #2d2d2d;color:#9ca3af;font-size:13px;text-transform:capitalize;">${c.field}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #2d2d2d;color:#ef4444;font-size:13px;text-decoration:line-through;">${c.from}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #2d2d2d;color:#34d399;font-size:13px;font-weight:bold;">${c.to}</td>
    </tr>
  `).join("");

  try {
    await transporter.sendMail({
      from:    `"Event Platform" <${process.env.GMAIL_USER}>`,
      to,
      subject: `Update: ${eventTitle} has changed`,
      html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:system-ui,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid #2d2d4e;">
    <div style="background:linear-gradient(135deg,#4c1d95,#7c3aed);padding:32px;text-align:center;">
      <p style="color:#ddd6fe;font-size:13px;margin:0 0 8px;">EVENT UPDATE</p>
      <h1 style="color:#fff;margin:0;font-size:22px;">${eventTitle}</h1>
    </div>
    <div style="padding:28px;">
      <p style="color:#a0aec0;margin:0 0 20px;">
        Hi <strong style="color:#e2e8f0;">${name}</strong>, the event details have been updated. Here's what changed:
      </p>
      <table style="width:100%;border-collapse:collapse;background:#111827;border-radius:12px;overflow:hidden;">
        <thead>
          <tr>
            <th style="padding:10px 12px;background:#1f2937;color:#6b7280;font-size:12px;text-align:left;text-transform:uppercase;letter-spacing:1px;">Field</th>
            <th style="padding:10px 12px;background:#1f2937;color:#6b7280;font-size:12px;text-align:left;text-transform:uppercase;letter-spacing:1px;">Was</th>
            <th style="padding:10px 12px;background:#1f2937;color:#6b7280;font-size:12px;text-align:left;text-transform:uppercase;letter-spacing:1px;">Now</th>
          </tr>
        </thead>
        <tbody>${changeRows}</tbody>
      </table>
      <div style="margin-top:24px;text-align:center;">
        <a href="${baseUrl}/events/${eventId}"
           style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:14px;">
          View Updated Event
        </a>
      </div>
      <p style="color:#4a5568;font-size:12px;margin-top:24px;text-align:center;">
        You're receiving this because you have a ticket for this event.
      </p>
    </div>
  </div>
</body>
</html>`,
    });
  } catch (err) {
    console.error("Update email error:", err);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where:  { email: session.user.email },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { id: idParam } = await params;
    const eventId = Number(idParam);

    // Verify ownership
    const existing = await prisma.event.findUnique({
      where:  { id: eventId },
      select: {
        createdById: true,
        title:       true,
        date:        true,
        time:        true,
        location:    true,
        description: true,
        host:        true,
        image:       true,
      },
    });
    if (!existing)
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    if (existing.createdById !== user.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const {
      title, host, description, location, image,
      startDate, startTime, endDate, endTime,
      lat, lng,
    } = body;

    if (!title?.trim())
      return NextResponse.json({ error: "Title is required" }, { status: 400 });

    // Build updated fields
    const newDate = startDate && startTime
      ? new Date(`${startDate}T${startTime}`)
      : existing.date;

    const newTime = startTime
      ? `${startTime}${endDate && endTime ? ` – ${endTime} (${endDate})` : ""}`
      : existing.time;

    const newLocation = location?.trim()
      ? (lat && lng ? location.trim() : location.trim())
      : existing.location;

    const newMapUrl = lat && lng
      ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`
      : undefined;

    // Detect critical changes that warrant notifying ticket holders
    const changes: { field: string; from: string; to: string }[] = [];

    const oldDateStr = existing.date.toLocaleDateString("en-KE", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
    const newDateStr = newDate.toLocaleDateString("en-KE",       { weekday:"long", year:"numeric", month:"long", day:"numeric" });
    if (oldDateStr !== newDateStr) changes.push({ field: "date", from: oldDateStr, to: newDateStr });

    if (existing.time !== newTime)
      changes.push({ field: "time", from: existing.time, to: newTime });

    if (existing.location !== newLocation)
      changes.push({ field: "venue", from: existing.location, to: newLocation });

    // Update the event
    const updateData: any = {
      title:       title.trim(),
      host:        host?.trim()        ?? existing.host,
      description: description?.trim() ?? existing.description,
      location:    newLocation,
      date:        newDate,
      time:        newTime,
      image:       image || existing.image,
    };
    if (newMapUrl) updateData.mapUrl = newMapUrl;

    const updated = await prisma.event.update({
      where: { id: eventId },
      data:  updateData,
    });

    // If critical fields changed, email all confirmed ticket holders
    if (changes.length > 0) {
      const orders = await prisma.order.findMany({
        where:  { eventId, status: "confirmed" },
        select: { name: true, email: true },
      });

      // Deduplicate by email
      const unique = Array.from(new Map(orders.map(o => [o.email, o])).values());
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:4000";

      await Promise.all(unique.map(order =>
        sendUpdateEmail({
          to:         order.email,
          name:       order.name,
          eventTitle: updated.title,
          changes,
          eventId,
          baseUrl,
        })
      ));

      console.log(`✅ Sent update emails to ${unique.length} ticket holder(s) for event ${eventId}`);
    }

    return NextResponse.json({ event: updated });
  } catch (err: any) {
    console.error("Event update error:", err);
    return NextResponse.json({ error: err.message ?? "Internal server error" }, { status: 500 });
  }
}