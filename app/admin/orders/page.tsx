import { prisma } from "@/lib/db/prisma";
import { AdminOrdersClient, type AdminOrderRow } from "@/components/admin/AdminOrdersClient";
import { getExchangeRates } from "@/lib/services/exchangeRates";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
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
    },
  });

  const serializedOrders: AdminOrderRow[] = orders.map((o) => {
    const customerName =
      o.user?.name || o.guestName || o.address?.fullName || o.user?.email || o.guestEmail || "Guest";
    const customerEmail = o.user?.email || o.guestEmail || "No email";

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
      items: o.items.map((i) => ({
        id: i.id,
        productName: i.productName,
        size: i.size,
        color: i.color,
        quantity: i.quantity,
        price: Number(i.price || 0),
        imageUrl: i.variant?.product?.images?.[0]?.url,
        slug: i.variant?.product?.slug,
      })),
    };
  });

  const exchangeRates = await getExchangeRates();

  return <AdminOrdersClient initialOrders={serializedOrders} exchangeRates={exchangeRates} />;
}