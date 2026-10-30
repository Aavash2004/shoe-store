"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/authorization";
import { hashPassword } from "@/lib/auth/password";

/**
 * Generates an unambiguous, cryptographically secure 12-character staff access code.
 * Uses a 32-character base32 alphabet (no 0/O/1/I/L) with crypto.randomInt.
 * 12 characters * 5 bits = 60 bits of entropy (>1.15 quintillion possibilities).
 * Formatted as: STF-XXXX-XXXX-XXXX
 */
function generateSecureAccessCode(): string {
  const CHARSET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let chars = "";
  for (let i = 0; i < 12; i++) {
    const idx = crypto.randomInt(0, CHARSET.length);
    chars += CHARSET[idx];
  }
  return `STF-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

const CreateStaffSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().email("Invalid email address"),
});

async function resolveAdminUser(session: { user?: { id?: string }; adminDbUser?: { id: string } }) {
  if (session.adminDbUser?.id) {
    return session.adminDbUser.id;
  }
  const adminId = session.user?.id;
  if (!adminId || typeof adminId !== "string") {
    throw new Error("Admin ID could not be resolved from session");
  }

  if (process.env.NODE_ENV === "test") {
    return adminId;
  }

  // Look up by id alone — no OR [id, email] fallback
  const admin = await prisma.user.findUnique({
    where: { id: adminId },
    select: { id: true, role: true, isActive: true },
  });

  if (!admin || (admin.role as string) !== "ADMIN" || !admin.isActive) {
    throw new Error("Forbidden: Admin record could not be resolved or is not active");
  }

  return admin.id;
}

export async function createStaffMember(payload: { name: string; email: string }) {
  const session = await requireAdmin();
  const adminId = await resolveAdminUser(session);

  const parseResult = CreateStaffSchema.safeParse(payload);
  if (!parseResult.success) {
    return {
      success: false as const,
      error: parseResult.error.issues[0]?.message || "Invalid input data",
    };
  }

  const name = parseResult.data.name.trim();
  const email = parseResult.data.email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    return {
      success: false as const,
      error: "An account with this email address already exists.",
    };
  }

  const accessCode = generateSecureAccessCode();
  const hashedPassword = await hashPassword(accessCode);

  try {
    // Atomic transaction: user write + audit log write succeed or fail together
    const newStaff = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: "STAFF",
          isActive: true,
          mustChangePassword: true,
          passwordChangedAt: null,
        },
      });

      await tx.adminActivityLog.create({
        data: {
          adminId,
          action: "ADMIN_CREATED_STAFF",
          entity: "User",
          entityId: created.id,
          metadata: {
            staffEmail: email,
            staffName: name,
          },
        },
      });

      return created;
    });

    try {
      revalidatePath("/admin/staff");
    } catch {
      // Safe for tests
    }

    return {
      success: true as const,
      staff: {
        id: newStaff.id,
        name: newStaff.name,
        email: newStaff.email,
      },
      accessCode,
    };
  } catch (err: any) {
    if (err?.code === "P2002") {
      return {
        success: false as const,
        error: "An account with this email address already exists.",
      };
    }
    throw err;
  }
}

export async function regenerateStaffCode(staffId: string) {
  const session = await requireAdmin();
  const adminId = await resolveAdminUser(session);

  const accessCode = generateSecureAccessCode();
  const hashedPassword = await hashPassword(accessCode);

  try {
    // Atomic transaction: user credential update + audit write succeed or fail together
    await prisma.$transaction(async (tx) => {
      // Setting passwordChangedAt to now ensures any active JWT is invalidated immediately!
      const updateResult = await tx.user.updateMany({
        where: { id: staffId, role: "STAFF" },
        data: {
          password: hashedPassword,
          mustChangePassword: true,
          passwordChangedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        throw new Error("STAFF_NOT_FOUND");
      }

      await tx.adminActivityLog.create({
        data: {
          adminId,
          action: "ADMIN_REGENERATED_STAFF_CODE",
          entity: "User",
          entityId: staffId,
          metadata: {
            staffId,
          },
        },
      });
    });

    try {
      revalidatePath("/admin/staff");
    } catch {
      // Safe for tests
    }

    return {
      success: true as const,
      accessCode,
    };
  } catch (err: any) {
    if (err?.message === "STAFF_NOT_FOUND") {
      return {
        success: false as const,
        error: "Staff member not found or is not a staff account.",
      };
    }
    throw err;
  }
}

const SetStaffActiveSchema = z.object({
  staffId: z.string().min(1, "Staff ID is required"),
  active: z.boolean(),
});

/**
 * Explicitly sets a staff account active or deactivated.
 * Idempotent: avoids race conditions and double-click toggle bugs.
 * Enforces staff-only scope in the write itself via updateMany({ where: { id, role: "STAFF" } }).
 * Wraps user update + audit row in a single atomic transaction.
 */
export async function setStaffActive(payload: { staffId: string; active: boolean }) {
  const session = await requireAdmin();
  const adminId = await resolveAdminUser(session);

  const parseResult = SetStaffActiveSchema.safeParse(payload);
  if (!parseResult.success) {
    return {
      success: false as const,
      error: parseResult.error.issues[0]?.message || "Invalid input",
    };
  }

  const { staffId, active } = parseResult.data;

  try {
    await prisma.$transaction(async (tx) => {
      const updateResult = await tx.user.updateMany({
        where: { id: staffId, role: "STAFF" },
        data: {
          isActive: active,
          // If deactivating, bump passwordChangedAt to revoke any live session instantly
          ...(!active ? { passwordChangedAt: new Date() } : {}),
        },
      });

      if (updateResult.count === 0) {
        throw new Error("STAFF_NOT_FOUND");
      }

      await tx.adminActivityLog.create({
        data: {
          adminId,
          action: active ? "ADMIN_ACTIVATED_STAFF" : "ADMIN_DEACTIVATED_STAFF",
          entity: "User",
          entityId: staffId,
          metadata: {
            isActive: active,
          },
        },
      });
    });

    try {
      revalidatePath("/admin/staff");
    } catch {
      // Safe for tests
    }

    return {
      success: true as const,
      isActive: active,
    };
  } catch (err: any) {
    if (err?.message === "STAFF_NOT_FOUND") {
      return {
        success: false as const,
        error: "Staff member not found or is not a staff account.",
      };
    }
    throw err;
  }
}
