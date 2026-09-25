import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

export interface NotificationItem {
  id: string;
  orderId?: string;
  orderNumber?: string;
  type: "ORDER_PLACED" | "PAYMENT_SUCCESS" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "ANNOUNCEMENT";
  title: string;
  message: string;
  createdAt: string;
  link: string;
  statusBadge?: string;
  statusColor?: "emerald" | "blue" | "amber" | "purple";
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    const { searchParams } = new URL(request.url);
    const guestOrderIdsParam = searchParams.get("orderIds");
    const guestOrderIds = guestOrderIdsParam
      ? guestOrderIdsParam
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id.length > 0)
          .slice(0, 10)
      : [];

    // Construct query condition: user orders OR guest orders by ID
    const orConditions: any[] = [];
    if (userId) {
      orConditions.push({ userId });
    }
    if (guestOrderIds.length > 0) {
      orConditions.push({ id: { in: guestOrderIds } });
    }

    let orders: any[] = [];
    if (orConditions.length > 0) {
      orders = await prisma.order.findMany({
        where: { OR: orConditions },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          items: {
            take: 2,
            select: {
              productName: true,
              quantity: true,
            },
          },
          statusHistory: {
            orderBy: { createdAt: "desc" },
            take: 4,
          },
        },
      });
    }

    const notifications: NotificationItem[] = [];

    for (const order of orders) {
      const firstItem = order.items[0]?.productName || "Footwear Item";
      const extraItems = order.items.length > 1 ? ` +${order.items.length - 1} more` : "";

      // 1. Initial Order Placement Notification
      notifications.push({
        id: `notif-placed-${order.id}`,
        orderId: order.id,
        orderNumber: order.orderNumber,
        type: "ORDER_PLACED",
        title: `Order #${order.orderNumber} Placed`,
        message: `${firstItem}${extraItems} · Total: ${order.currency} ${Number(order.total).toFixed(2)}`,
        createdAt: order.createdAt.toISOString(),
        link: `/order-confirmation/${order.id}`,
        statusBadge: order.status,
        statusColor: order.status === "DELIVERED" ? "emerald" : "blue",
      });

      // 2. Payment confirmed notification if paid
      if (order.paymentStatus === "PAID") {
        notifications.push({
          id: `notif-paid-${order.id}`,
          orderId: order.id,
          orderNumber: order.orderNumber,
          type: "PAYMENT_SUCCESS",
          title: `Payment Confirmed · #${order.orderNumber}`,
          message: `Payment of ${order.currency} ${Number(order.total).toFixed(2)} received via ${order.paymentMethod || "online checkout"}.`,
          createdAt: order.updatedAt.toISOString(),
          link: `/order-confirmation/${order.id}`,
          statusBadge: "PAID",
          statusColor: "emerald",
        });
      }

      // 3. Status History Updates (e.g. SHIPPED, PROCESSING, DELIVERED)
      for (const history of order.statusHistory) {
        if (history.status === "PENDING") continue; // Already covered by placement

        let type: NotificationItem["type"] = "PROCESSING";
        let statusColor: NotificationItem["statusColor"] = "blue";
        let title = `Order Update: ${history.status}`;

        if (history.status === "SHIPPED") {
          type = "SHIPPED";
          statusColor = "blue";
          title = `Order #${order.orderNumber} Shipped`;
        } else if (history.status === "DELIVERED") {
          type = "DELIVERED";
          statusColor = "emerald";
          title = `Order #${order.orderNumber} Delivered`;
        } else if (history.status === "PAID") {
          continue; // Already covered
        }

        notifications.push({
          id: `notif-history-${history.id}`,
          orderId: order.id,
          orderNumber: order.orderNumber,
          type,
          title,
          message: history.note || `Order status updated to ${history.status}.`,
          createdAt: history.createdAt.toISOString(),
          link: `/order-confirmation/${order.id}`,
          statusBadge: history.status,
          statusColor,
        });
      }
    }

    // 4. Default Store Announcement if notifications list is empty or minimal
    if (notifications.length === 0) {
      notifications.push({
        id: "notif-welcome-atelier",
        type: "ANNOUNCEMENT",
        title: "Welcome to ABXV Footwear",
        message: "Explore our latest sneaker drops with complimentary express shipping on all orders.",
        createdAt: new Date().toISOString(),
        link: "/shop",
        statusBadge: "ATELIER",
        statusColor: "purple",
      });
    }

    // Sort by latest timestamp descending
    notifications.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ notifications }, { status: 200 });
  } catch (error: any) {
    console.error("[Notifications API Error]:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
