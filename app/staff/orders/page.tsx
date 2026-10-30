import { prisma } from "@/lib/db/prisma";
import { StaffOrdersClient, type StaffOrderRow } from "@/components/staff/StaffOrdersClient";
import { requireStaff } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

export default async function StaffOrdersPage() {
  await requireStaff();

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
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
      address: {
        select: {
          fullName: true,
          city: true,
          state: true,
          country: true,
        },
      },
      statusHistory: {
        where: { status: "SHIPPED" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const serializedOrders: StaffOrderRow[] = orders.map((o) => {
    const customerName =
      o.user?.name || o.guestName || o.address?.fullName || o.user?.email || o.guestEmail || "Customer";
    const customerEmail = o.user?.email || o.guestEmail || "No email";

    // Extract tracking info from latest SHIPPED history entry if available
    const shippedHistory = o.statusHistory[0];
    let trackingNumber: string | null = null;
    let carrier: string | null = null;
    if (shippedHistory?.note) {
      const match = shippedHistory.note.match(/Shipped via (.*?) \(Tracking: (.*?)\)/);
      if (match) {
        carrier = match[1] || null;
        trackingNumber = match[2] || null;
      }
    }

    return {
      id: o.id,
      orderNumber: o.orderNumber,
      total: Number(o.total || 0),
      currency: o.currency || "USD",
      status: o.status,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod,
      createdAt: o.createdAt.toISOString(),
      customerName,
      customerEmail,
      shippingCity: o.address?.city,
      shippingCountry: o.address?.country,
      trackingNumber,
      carrier,
      items: o.items.map((i) => ({
        id: i.id,
        productName: i.productName,
        size: i.size,
        color: i.color,
        quantity: i.quantity,
        price: Number(i.price || 0),
        imageUrl: i.variant?.product?.images?.[0]?.url,
      })),
    };
  });

  return <StaffOrdersClient initialOrders={serializedOrders} />;
}
