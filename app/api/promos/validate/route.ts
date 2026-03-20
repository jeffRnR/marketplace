// app/api/promos/validate/route.ts
// Public endpoint — no auth needed, just validates a promo code exists and is active
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = Number(searchParams.get("eventId"));
    const code    = searchParams.get("code")?.trim().toUpperCase();

    if (!eventId || !code)
      return NextResponse.json({ error: "eventId and code required" }, { status: 400 });

    const promo = await prisma.promoCode.findFirst({
      where: { eventId, code, active: true },
    });

    if (!promo)
      return NextResponse.json({ error: "Invalid or inactive promo code." }, { status: 404 });

    if (promo.uses >= promo.maxUses)
      return NextResponse.json({ error: "This promo code has reached its usage limit." }, { status: 400 });

    return NextResponse.json({ code: promo.code, discount: promo.discount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}