// app/api/test-db/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // Test database connection
    const userCount = await prisma.user.count();
    
    return NextResponse.json({
      success: true,
      message: "Database connection successful",
      userCount,
    });
  } catch (error: any) {
    console.error("Database test error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Database connection failed",
        error: error.message,
      },
      { status: 500 }
    );
  }
}