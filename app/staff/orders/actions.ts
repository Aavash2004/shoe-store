"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireStaff } from "@/lib/auth/authorization";

const SAFE_TEXT_REGEX = /^[a-zA-Z0-9 \-_.#/]+$/;

const optionalSafeText = z.preprocess(
  (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
  z
    .string()
    .trim()
    .max(100, "Text too long")
    .regex(SAFE_TEXT_REGEX, "Contains invalid characters or line breaks")
    .optional()
);

const StaffUpdateOrderStatusSchema = z.object({
  orderId: z.string().min(1, "Order ID is required."),
  status: z.enum(["PROCESSING", "SHIPPED"]),
  trackingNumber: optionalSafeText,
  carrier: optionalSafeText,
  note: z.string().trim().max(500, "Note cannot exceed 500 characters").optional(),
});

export async function staffUpdateOrderStatus(payload: {
  orderId: string;
  status: "PROCESSING" | "SHIPPED";
  trackingNumber?: string;
  carrier?: string;
  note?: string;
}) {
  let session;
  try {
    session = await requireStaff();
  } catch (authErr: any) {
    if (authErr?.message === "Password change required") {
      return {
        success: false as const,
        error: "Password change required",
        redirect: "/staff/change-password",
      };
    }
    return {
      success: false as const,
      error: "Forbidden: Access denied",
    };
  }
  const staffUser = session.staffDbUser;

  const parseResult = StaffUpdateOrderStatusSchema.safeParse(payload);
  if (!parseResult.success) {
    return {
      success: false as const,
      error: parseResult.error.issues[0]?.message || "Invalid status payload.",
    };
  }

  const { orderId, status: newStatus, trackingNumber, carrier, note } = parseResult.data;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    return { success: false as const, error: "Order not found." };
  }

  const currentStatus = order.status;

  // Enforce staff transition rules
  if (newStatus === "PROCESSING") {
    // Only PAID orders can be fulfilled. Unpaid orders must never be packed/shipped.
    if (order.paymentStatus !== "PAID") {
      return {
        success: false as const,
        error: `Cannot process unpaid order #${order.orderNumber}. Orders must be marked as PAID before fulfillment.`,
      };
    }

    if (currentStatus !== "CONFIRMED") {
      return {
        success: false as const,
        error: `Cannot move order from ${currentStatus} to PROCESSING. Staff can only process CONFIRMED orders.`,
      };
    }
  } else if (newStatus === "SHIPPED") {
    // Can only move to SHIPPED from PROCESSING
    if (currentStatus !== "PROCESSING") {
      return {
        success: false as const,
        error: `Cannot move order from ${currentStatus} to SHIPPED. Order must be in PROCESSING status first.`,
      };
    }

    // Tracking number is mandatory for staff shipping orders
    if (!trackingNumber || trackingNumber.trim().length === 0) {
      return {
        success: false as const,
        error: "A valid tracking number is required to mark an order as SHIPPED.",
      };
    }
  }

  const staffNameOrEmail =
    session.user?.name || session.user?.email || `Staff (${staffUser.id})`;

  const formattedNote =
    newStatus === "SHIPPED"
      ? `Shipped via ${carrier || "Standard"} (Tracking: ${trackingNumber})${note ? ` - ${note}` : ""}`
      : note || null;

  try {
    // Wrap conditional update, status history, and audit log in a single atomic transaction
    await prisma.$transaction(async (tx) => {
      const whereClause: any = {
        id: orderId,
        status: currentStatus,
      };

      // Always guard on paymentStatus for every PROCESSING transition
      if (newStatus === "PROCESSING") {
        whereClause.paymentStatus = "PAID";
      }

      const updateResult = await tx.order.updateMany({
        where: whereClause,
        data: {
          status: newStatus,
        },
      });

      if (updateResult.count === 0) {
        throw new Error("ORDER_CONFLICT");
      }

      // Write status history
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: newStatus,
          fromStatus: currentStatus,
          toStatus: newStatus,
          changedBy: staffNameOrEmail,
          note: formattedNote,
        },
      });

      // Write AdminActivityLog for audit trail
      await tx.adminActivityLog.create({
        data: {
          adminId: staffUser.id,
          action: "STAFF_CHANGED_ORDER_STATUS",
          entity: "Order",
          entityId: orderId,
          metadata: {
            fromStatus: currentStatus,
            newStatus,
            trackingNumber: trackingNumber || null,
            carrier: carrier || null,
          },
        },
      });
    });
  } catch (err: any) {
    if (err?.message === "ORDER_CONFLICT") {
      return {
        success: false as const,
        error: "Order was already transitioned or modified by another session. Please refresh the page.",
      };
    }
    console.error("[Staff Order Transition Error]", err);
    return {
      success: false as const,
      error: "An unexpected error occurred while transitioning order status.",
    };
  }

  // If shipped, dispatch transactional notification email outside the DB transaction
  if (newStatus === "SHIPPED") {
    try {
      const { sendShippingUpdateEmail } = await import("@/lib/services/email");
      await sendShippingUpdateEmail(orderId, note);
    } catch (emailErr) {
      console.warn("[Staff Order Status] Failed to dispatch email notification:", emailErr);
    }
  }

  try {
    revalidatePath("/staff/orders");
    revalidatePath(`/staff/orders/${orderId}`);
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");
    revalidatePath(`/account/orders/${orderId}`);
  } catch {
    // Safe for test environments
  }

  return { success: true as const };
}
