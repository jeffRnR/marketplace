// app/api/waitlist/count/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const count = await prisma.waitlistEntry.count();
    return NextResponse.json({ count });
  } catch (err) {
    console.error("COUNT API ERROR:", err);
    return NextResponse.json({ count: 0 });
  }
}