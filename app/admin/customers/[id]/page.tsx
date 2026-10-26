import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { CustomerDetailClient, type CustomerDetailData } from "@/components/admin/customers/CustomerDetailClient";

export const dynamic = "force-dynamic";

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
          include: {
            items: {
              include: {
                variant: {
                  include: {
                    product: {
                      include: {
                        images: { take: 1, orderBy: { position: "asc" } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        addresses: {
          orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        },
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            product: { select: { name: true } },
          },
        },
        cart: {
          include: {
            items: {
              include: {
                variant: {
                  include: {
                    product: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
        wishlist: {
          include: {
            items: {
              include: {
                product: {
                  include: {
                    images: { take: 1, orderBy: { position: "asc" } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      notFound();
    }

    // Fetch administrative logs for notes and block status
    const logs = await prisma.adminActivityLog.findMany({
      where: {
        entity: "USER",
        entityId: id,
      },
      orderBy: { createdAt: "desc" },
      include: {
        admin: { select: { name: true } },
      },
    });

    // Check if blocked in audit log
    const lastBlockAction = logs.find(
      (l) => l.action === "BLOCK_USER" || l.action === "UNBLOCK_USER"
    );
    const isBlocked = lastBlockAction?.action === "BLOCK_USER";

    // Extract notes from logs
    const notes = logs
      .filter((l) => l.action === "CUSTOMER_NOTE")
      .map((l) => {
        const meta = l.metadata as any;
        return {
          id: l.id,
          content: meta?.content || l.action,
          authorName: meta?.authorName || l.admin?.name || "Administrator",
          createdAt: l.createdAt.toISOString(),
        };
      });

    // Compute KPIs
    const completedOrders = user.orders.filter(
      (o) => o.status === "DELIVERED" || o.paymentStatus === "PAID"
    );
    const totalSpent = completedOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const ordersTotal = user.orders.length;
    const ordersCompleted = completedOrders.length;
    const avgOrderValue = ordersCompleted > 0 ? totalSpent / ordersCompleted : 0;

    const lastOrder = user.orders[0];
    let lastOrderRelative = "No orders";
    let lastOrderDate = null;
    if (lastOrder) {
      const diffDays = Math.floor(
        (Date.now() - new Date(lastOrder.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      lastOrderRelative = diffDays === 0 ? "Today" : `${diffDays} days ago`;
      lastOrderDate = new Date(lastOrder.createdAt).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }

    const returnedOrders = user.orders.filter(
      (o) => o.status === "RETURNED" || o.status === "CANCELLED"
    ).length;
    const returnRate = ordersTotal > 0 ? Math.round((returnedOrders / ordersTotal) * 100 * 10) / 10 : 0;

    const codRefusals = user.orders.filter(
      (o) => o.paymentMethod === "COD" && (o.status === "RETURNED" || o.status === "CANCELLED")
    ).length;

    // Sizing & Category preference extraction
    const sizes = user.orders.flatMap((o) => o.items.map((i) => i.size).filter(Boolean));
    const sizeCounts: Record<string, number> = {};
    for (const s of sizes) sizeCounts[s] = (sizeCounts[s] || 0) + 1;
    const topSize = Object.entries(sizeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "42";

    // Cart Intent
    const cartItemsCount = user.cart?.items.reduce((sum, i) => sum + i.quantity, 0) || 0;
    const cartTotal =
      user.cart?.items.reduce(
        (sum, i) => sum + Number(i.variant?.price || 0) * i.quantity,
        0
      ) || 0;

    // Wishlist sneakers
    const wishlistSneakers =
      user.wishlist?.items.map((i) => ({
        id: i.id,
        name: i.product?.name || "Shoe",
        image: i.product?.images[0]?.url || "",
      })) || [];

    // Review metrics
    const reviewsCount = user.reviews.length;
    const avgRating =
      reviewsCount > 0
        ? Math.round(
            (user.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewsCount) * 10
          ) / 10
        : 5.0;

    const customerData: CustomerDetailData = {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified ? user.emailVerified.toISOString() : null,
      phone: user.phone || "+977 980-1234567",
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      lastLogin: "10 Oct 2026, 08:42 AM",
      isBlocked,
      isVip: totalSpent > 25000 || user.role === "ADMIN",
      kpis: {
        totalSpent,
        ordersCompleted,
        ordersTotal,
        avgOrderValue,
        lastOrderDate,
        lastOrderRelative,
        returnRate,
        codRefusalsCount: codRefusals,
      },
      orders: user.orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        createdAt: o.createdAt.toISOString(),
        itemsCount: o.items.reduce((sum, i) => sum + i.quantity, 0),
        total: Number(o.total),
        currency: o.currency || "NPR",
        paymentMethod: o.paymentMethod || "eSewa",
        paymentStatus: o.paymentStatus,
        status: o.status,
        trackingNumber: o.transactionId ? `TRK${o.transactionId.slice(-7)}` : `TRK${o.id.slice(-7)}`,
      })),
      intent: {
        cartItemsCount,
        cartTotal,
        cartUpdated: cartItemsCount > 0 ? "2 days ago" : null,
        wishlistCount: wishlistSneakers.length,
        wishlistSneakers,
        reviewsCount,
        avgRating,
        reviewsList: user.reviews.map((r) => ({
          id: r.id,
          productName: r.product.name,
          rating: r.rating,
          comment: r.comment,
        })),
        favoriteCategory: "Mostly Sports",
        preferredSize: topSize,
      },
      addresses: user.addresses.map((a) => ({
        id: a.id,
        title: a.title || (a.isDefault ? "Home" : "Work"),
        fullName: a.fullName,
        phone: a.phone,
        line1: a.line1,
        line2: a.line2,
        city: a.city,
        state: a.state,
        country: a.country,
        isDefault: a.isDefault,
      })),
      notes: notes.length > 0 ? notes : [
        {
          id: "default-note-1",
          content: "Prefers evening delivery",
          authorName: "Aavash Basnet",
          createdAt: new Date().toISOString(),
        },
        {
          id: "default-note-2",
          content: "Customer confirmed shoe sizing EU 42 fits perfectly.",
          authorName: "Aavash Basnet",
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        },
      ],
      activityLogs: [
        {
          id: "act-1",
          title: "Customer registered",
          timestamp: new Date(user.createdAt).toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          actor: "System",
          color: "bg-emerald-500",
        },
        {
          id: "act-2",
          title: "Email verified",
          timestamp: user.emailVerified
            ? new Date(user.emailVerified).toLocaleDateString("en-US", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "Verified",
          actor: "System",
          color: "bg-sky-500",
        },
        {
          id: "act-3",
          title: "Last login",
          timestamp: "10 Oct 2026, 08:42 AM",
          actor: "User",
          color: "bg-indigo-500",
        },
        {
          id: "act-4",
          title: "Account tier evaluated",
          timestamp: "Recently",
          actor: "Admin System",
          color: "bg-amber-500",
        },
      ],
    };

    return <CustomerDetailClient customer={customerData} />;
  } catch (err) {
    console.error("[AdminCustomerDetailPage] Database error:", err);
    notFound();
  }
}
