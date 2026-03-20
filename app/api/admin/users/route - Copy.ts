// app/api/admin/users/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        accounts: {
          select: {
            provider: true,
          },
        },
        _count: {
          select: {
            events: true,
            sessions: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      count: users.length,
      users: users.map((user) => ({
        ...user,
        hasPassword: false, // Don't expose password info
        authMethods: user.accounts.map((a) => a.provider),
      })),
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}