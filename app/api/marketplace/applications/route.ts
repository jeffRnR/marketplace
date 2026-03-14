// app/api/marketplace/applications/route.ts
// Vendor-to-event applications have been removed from the marketplace.
// Vendors are now discovered via the marketplace directory and contacted
// directly via the inquiry system. Event vending slots are handled
// separately via /api/vending/slots and /api/vending/applications.

import { NextResponse } from "next/server";

const GONE = { error: "Marketplace vendor applications have been removed. Use the vending slots system instead." };

export async function GET()   { return NextResponse.json(GONE, { status: 410 }); }
export async function POST()  { return NextResponse.json(GONE, { status: 410 }); }
export async function PATCH() { return NextResponse.json(GONE, { status: 410 }); }