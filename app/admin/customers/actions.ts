"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { isAdminSession } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db/prisma";

export async function toggleCustomerBlock(userId: string, shouldBlock: boolean, reason?: string) {
  const session = await auth();
  if (!session?.user?.id || !isAdminSession(session)) {
    return { success: false, error: "Unauthorized access." };
  }

  try {
    const adminId = session.user.id;

    // Log the block/unblock action in AdminActivityLog
    await prisma.adminActivityLog.create({
      data: {
        adminId,
        action: shouldBlock ? "BLOCK_USER" : "UNBLOCK_USER",
        entity: "USER",
        entityId: userId,
        metadata: {
          reason: reason || (shouldBlock ? "Blocked by administrator" : "Unblocked by administrator"),
          timestamp: new Date().toISOString(),
        },
      },
    });

    revalidatePath(`/admin/customers/${userId}`);
    revalidatePath("/admin/customers");
    return { success: true, isBlocked: shouldBlock };
  } catch (err: any) {
    console.error("[toggleCustomerBlock] Error:", err);
    return { success: false, error: err.message || "Failed to update customer status." };
  }
}

export async function updateCustomerRole(userId: string, newRole: "USER" | "ADMIN" | "CUSTOMER") {
  const session = await auth();
  if (!session?.user?.id || !isAdminSession(session)) {
    return { success: false, error: "Unauthorized access." };
  }

  try {
    const adminId = session.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user) return { success: false, error: "Customer not found." };

    await prisma.user.update({
      where: { id: userId },
      data: { role: newRole as any },
    });

    await prisma.adminActivityLog.create({
      data: {
        adminId,
        action: "CHANGE_ROLE",
        entity: "USER",
        entityId: userId,
        metadata: {
          previousRole: user.role,
          newRole,
          timestamp: new Date().toISOString(),
        },
      },
    });

    revalidatePath(`/admin/customers/${userId}`);
    revalidatePath("/admin/customers");
    return { success: true, role: newRole };
  } catch (err: any) {
    console.error("[updateCustomerRole] Error:", err);
    return { success: false, error: err.message || "Failed to update role." };
  }
}

export async function addCustomerNote(userId: string, noteContent: string) {
  const session = await auth();
  if (!session?.user?.id || !isAdminSession(session)) {
    return { success: false, error: "Unauthorized access." };
  }

  if (!noteContent.trim()) {
    return { success: false, error: "Note content cannot be empty." };
  }

  try {
    const adminId = session.user.id;
    const adminName = session.user.name || "Administrator";

    const log = await prisma.adminActivityLog.create({
      data: {
        adminId,
        action: "CUSTOMER_NOTE",
        entity: "USER",
        entityId: userId,
        metadata: {
          content: noteContent.trim(),
          authorName: adminName,
          createdAt: new Date().toISOString(),
        },
      },
    });

    revalidatePath(`/admin/customers/${userId}`);
    return {
      success: true,
      note: {
        id: log.id,
        content: noteContent.trim(),
        authorName: adminName,
        createdAt: log.createdAt.toISOString(),
      },
    };
  } catch (err: any) {
    console.error("[addCustomerNote] Error:", err);
    return { success: false, error: err.message || "Failed to add note." };
  }
}

export async function deleteCustomerNote(noteId: string, userId: string) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return { success: false, error: "Unauthorized access." };
  }

  try {
    await prisma.adminActivityLog.delete({
      where: { id: noteId },
    });

    revalidatePath(`/admin/customers/${userId}`);
    return { success: true };
  } catch (err: any) {
    console.error("[deleteCustomerNote] Error:", err);
    return { success: false, error: err.message || "Failed to delete note." };
  }
}
