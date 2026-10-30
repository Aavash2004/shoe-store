import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { name, password } = parsed.data;
  const email = parsed.data.email.trim().toLowerCase();
  const configuredAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (configuredAdminEmail && email === configuredAdminEmail) {
    return NextResponse.json(
      { error: "Registration not permitted for this email address" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Same error for all cases — don't reveal whether the email is STAFF, ADMIN, or CUSTOMER
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // CRITICAL: Always hardcode CUSTOMER. Public signup can never produce STAFF or ADMIN.
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: "CUSTOMER",
    },
  });

  // Automatically link any previous guest purchases made with this email address
  await prisma.order.updateMany({
    where: {
      guestEmail: email,
      userId: null,
    },
    data: {
      userId: user.id,
    },
  });

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
}