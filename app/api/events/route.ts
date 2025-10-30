import { NextResponse } from "next/server";
import Event from "@/models/Event";
import { connectDB } from "@/lib/mongodb";

// GET all events
export async function GET() {
  await connectDB();
  const events = await Event.find().populate("categoryId");
  return NextResponse.json(events);
}

// POST create a new event
export async function POST(req: Request) {
  await connectDB();
  try {
    const body = await req.json();
    const newEvent = await Event.create(body);
    return NextResponse.json(newEvent, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "An unknown error occurred" }, { status: 500 });
  }
}
