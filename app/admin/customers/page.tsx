import { prisma } from "@/lib/db/prisma";
import { CustomerListClient, type CustomerListItem } from "@/components/admin/customers/CustomerListClient";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        orders: {
          select: {
            total: true,
            status: true,
            paymentStatus: true,
          },
        },
      },
    });

    const customers: CustomerListItem[] = users.map((u) => {
      const paidOrders = u.orders.filter(
        (o) => o.status === "DELIVERED" || o.paymentStatus === "PAID"
      );
      const totalSpent = paidOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        createdAt: u.createdAt.toISOString(),
        ordersCount: u.orders.length,
        totalSpent,
      };
    });

    return <CustomerListClient initialCustomers={customers} />;
  } catch (err) {
    console.error("[AdminCustomersPage] Failed to fetch customers:", err);
    return <CustomerListClient initialCustomers={[]} />;
  }
}
