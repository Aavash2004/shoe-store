import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid email" },
        { status: 400 }
      );
    }

    const email = parsed.data.email.trim().toLowerCase();

    // Check if user exists with this email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // To prevent email enumeration, return a generic success message even if email not found
    if (!user) {
      return NextResponse.json({
        message: "If an account with that email exists, we have generated password reset instructions.",
      });
    }

    // Generate secure random token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

    // Delete any existing tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { email },
    });

    // Store token
    await prisma.passwordResetToken.create({
      data: {
        email,
        token,
        expiresAt,
      },
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${token}`;

    console.log(`[PASSWORD RESET] Reset link generated for ${email}: ${resetUrl}`);

    return NextResponse.json({
      message: "If an account with that email exists, we have generated password reset instructions.",
      // Include direct reset link in development mode for convenience
      ...(process.env.NODE_ENV === "development" ? { debugResetUrl: resetUrl } : {}),
    });
  } catch (error: any) {
    console.error("[Forgot Password Error]:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
