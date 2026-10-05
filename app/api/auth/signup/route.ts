// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import { consumeAuthAttempt } from "@/lib/authRateLimit";
import { getPasswordPolicyError } from "@/lib/passwordPolicy";

const SIGNUP_RESPONSE = {
  message: "If this address can be registered, you can now sign in.",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const emailInput = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";
    const email = emailInput.trim().toLowerCase();

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email.length > 254 || !emailRegex.test(email)) {
      return NextResponse.json(
        { message: "Invalid email format" },
        { status: 400 }
      );
    }

    const passwordPolicyError = getPasswordPolicyError(password);
    if (passwordPolicyError) {
      return NextResponse.json({ message: passwordPolicyError }, { status: 400 });
    }

    const clientIp = req.headers.get("x-real-ip")?.trim()
      || req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
    const emailAllowed = await consumeAuthAttempt(`signup:email:${email}`, 3, 60 * 60);
    const ipAllowed = clientIp
      ? await consumeAuthAttempt(`signup:ip:${clientIp}`, 10, 60 * 60)
      : true;
    if (!emailAllowed || !ipAllowed) {
      return NextResponse.json(
        { message: "Too many attempts. Please wait before trying again." },
        { status: 429 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) return NextResponse.json(SIGNUP_RESPONSE, { status: 202 });

    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: "USER",
      },
    });

    return NextResponse.json(SIGNUP_RESPONSE, { status: 202 });
  } catch (error: unknown) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "An error occurred during registration" },
      { status: 500 }
    );
  }
}
