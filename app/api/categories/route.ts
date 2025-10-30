import { NextResponse } from "next/server";
import Category from "@/models/Category";
import { connectDB } from "@/lib/mongodb";

// GET all categories
export async function GET() {
  await connectDB();
  const categories = await Category.find();
  return NextResponse.json(categories);
}

// POST create a new category
export async function POST(req: Request) {
  await connectDB();
  try {
    const body = await req.json();
    const newCategory = await Category.create(body);
    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    // Use 'unknown' instead of 'any'
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    // Handle unexpected error types safely
    return NextResponse.json({ error: "An unknown error occurred" }, { status: 500 });
  }
}
