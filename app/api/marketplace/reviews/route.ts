// app/api/marketplace/reviews/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { profileId, reviewerName, reviewerEmail, rating, comment } = body;

    if (!profileId || !reviewerName?.trim() || !reviewerEmail?.trim() || !rating)
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    if (rating < 1 || rating > 5)
      return NextResponse.json({ error: "Rating must be 1–5" }, { status: 400 });

    const review = await prisma.marketReview.create({
      data: { profileId, reviewerName: reviewerName.trim(),
              reviewerEmail: reviewerEmail.trim(), rating: Number(rating),
              comment: comment?.trim() ?? null },
    });

    // Recalculate average rating
    const agg = await prisma.marketReview.aggregate({
      where: { profileId },
      _avg:  { rating: true },
      _count: { rating: true },
    });

    await prisma.marketProfile.update({
      where: { id: profileId },
      data:  { rating: agg._avg.rating ?? 0, reviewCount: agg._count.rating },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}