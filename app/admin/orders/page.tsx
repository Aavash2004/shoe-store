import Link from "next/link";
import { prisma } from "@/lib/db/prisma";

type OrderWithRelations = {
  id: string;
  orderNumber: string;
  total: any;
  status: string;
  createdAt: Date;
  user: {
    name: string | null;
    email: string | null;
  } | null;
  items: {
    quantity: number;
  }[];
};

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      items: true,
    },
  });

  const statusColor = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return "bg-emerald-50 text-emerald-700";
      case "SHIPPED":
        return "bg-sky-50 text-sky-700";
      case "PROCESSING":
        return "bg-amber-50 text-amber-700";
      case "CANCELLED":
        return "bg-rose-50 text-rose-700";
      default:
        return "bg-stone-100 text-stone-600";
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-navy)]/55">
          Sales
        </span>
        <h1 className="mt-0.5 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-navy)]">
          Orders
        </h1>
        <p className="mt-1 text-xs text-[var(--color-navy)]/60">
          {orders.length} total orders
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[var(--color-sand)] text-[10px] font-bold uppercase tracking-wider text-[var(--color-navy)]/55">
              <th className="px-6 py-4">Order</th>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4 text-center">Items</th>
              <th className="px-6 py-4 text-right">Total</th>
              <th className="px-6 py-4 text-right">Status</th>
              <th className="px-6 py-4 text-right">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-sand)]/70">
            {orders.map((order: OrderWithRelations) => {
              const totalQty = order.items.reduce(
                (sum: number, i: { quantity: number }) => sum + i.quantity,
                0
              );
              const customer =
                order.user?.name || order.user?.email || "Guest Customer";

              return (
                <tr key={order.id} className="hover:bg-[var(--color-sand)]/20">
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-mono font-bold text-[var(--color-navy)] hover:underline"
                    >
                      #{order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--color-navy)]/80">
                    {customer}
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-[var(--color-navy)]/70">
                    {totalQty}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-[var(--color-navy)]">
                    ${Number(order.total).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusColor(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-xs text-[var(--color-navy)]/50">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}