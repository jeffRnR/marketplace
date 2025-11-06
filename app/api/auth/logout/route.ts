import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST() {
  try {
    // ✅ FIX: Await cookies() before using .get() or .delete()
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (sessionCookie) {
      // Delete the session from the database
      await prisma.session.deleteMany({
        where: { sessionToken: sessionCookie.value },
      });

      // Delete the cookie
      cookieStore.delete("session");
    }

    return NextResponse.json(
      { message: "Logged out successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { message: "An error occurred during logout" },
      { status: 500 }
    );
  }
}
