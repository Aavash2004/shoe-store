import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

export async function POST(req: Request) {
  const authCheck = await requireStaffApi({ allowMustChangePassword: true });
  if (!authCheck.authorized) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: authCheck.status }
    );
  }

  try {
    const body = await req.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword || typeof currentPassword !== "string") {
      return NextResponse.json(
        { error: "Current temporary code/password is required" },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "New passwords do not match" },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "New password must be different from current temporary code" },
        { status: 400 }
      );
    }

    const userId = authCheck.staffDbUser.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Account credentials not found" },
        { status: 404 }
      );
    }

    const matches = await verifyPassword(currentPassword, user.password);
    if (!matches) {
      return NextResponse.json(
        { error: "Current temporary code is incorrect" },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Password updated successfully. Please log in with your new password.",
    });
  } catch (error: any) {
    console.error("[STAFF_CHANGE_PASSWORD_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to update password. Please try again." },
      { status: 500 }
    );
  }
}
