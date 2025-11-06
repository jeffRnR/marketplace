import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // ✅ FIX: Await cookies() before using .get()
    const cookieStore = await cookies();
    const sessionToken =
      cookieStore.get("next-auth.session-token")?.value ||
      cookieStore.get("__Secure-next-auth.session-token")?.value ||
      cookieStore.get("session")?.value;


    if (!sessionToken) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // ✅ Find session and user
    const session = await prisma.session.findUnique({
      where: { token: sessionToken },
      include: { user: true },
    });

    if (!session || !session.user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json(
      { user: session.user },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching user session:", error);
    return NextResponse.json(
      { message: "An error occurred while fetching user data" },
      { status: 500 }
    );
  }
}
