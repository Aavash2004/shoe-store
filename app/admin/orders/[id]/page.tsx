import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { OrderStatusControl } from "@/components/admin/OrderStatusControl";

export default async function AdminOrderDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const order = await prisma.order.findUnique({
        where: { id },
        include: {
            items: true,
            address: true,
            user: { select: { name: true, email: true } },
            statusHistory: { orderBy: { createdAt: "asc" } },
        },
    });

    if (!order) notFound();

    const customerName = order.user?.name || order.user?.email || order.guestName || "Guest";
    const customerEmail = order.user?.email || order.guestEmail;

    return (
        <div className="mx-auto max-w-4xl">
            <Link
                href="/admin/orders"
                className="mb-6 inline-flex items-center gap-1.5 text-sm text-navy/50 hover:text-navy"
            >
                <ArrowLeft className="h-4 w-4" />
                Orders
            </Link>

            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                    <p className="text-xs uppercase tracking-[0.15em] text-navy/50">Order</p>
                    <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-navy">
                        #{order.orderNumber}
                    </h1>
                    <p className="mt-1 text-sm text-navy/60">
                        Placed {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                </div>

                <OrderStatusControl orderId={order.id} currentStatus={order.status} />
            </div>

            <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-8">
                    {/* Items */}
                    <div>
                        <h2 className="text-xs font-bold uppercase tracking-wider text-navy">Items</h2>
                        <div className="mt-4 flex flex-col divide-y divide-sand">
                            {order.items.map((item) => (
                                <div key={item.id} className="flex justify-between py-3 text-sm">
                                    <div>
                                        <p className="font-medium text-navy">{item.productName}</p>
                                        <p className="text-navy/50">
                                            {item.color} · Size {item.size} · Qty {item.quantity}
                                        </p>
                                    </div>
                                    <p className="font-medium text-navy">
                                        ${(Number(item.price) * item.quantity).toFixed(2)}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex flex-col gap-1 border-t border-sand pt-4 text-sm">
                            <div className="flex justify-between text-navy/60">
                                <span>Subtotal</span>
                                <span>${Number(order.subtotal).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-navy/60">
                                <span>Shipping</span>
                                <span>${Number(order.shipping).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-medium text-navy">
                                <span>Total</span>
                                <span>${Number(order.total).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Status history */}
                    <div>
                        <h2 className="text-xs font-bold uppercase tracking-wider text-navy">Status History</h2>
                        <div className="mt-4 flex flex-col gap-3">
                            {order.statusHistory.map((h) => (
                                <div key={h.id} className="flex items-start gap-3 text-sm">
                                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
                                    <div>
                                        <p className="font-medium text-navy">{h.status}</p>
                                        <p className="text-xs text-navy/50">
                                            {new Date(h.createdAt).toLocaleString()}
                                            {h.note && ` — ${h.note}`}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Customer */}
                    <div>
                        <h2 className="text-xs font-bold uppercase tracking-wider text-navy">Customer</h2>
                        <p className="mt-3 text-sm text-navy">{customerName}</p>
                        <p className="text-sm text-navy/60">{customerEmail}</p>
                        {!order.userId && (
                            <span className="mt-1 inline-block rounded-full bg-sand px-2 py-0.5 text-xs text-navy/60">
                                Guest
                            </span>
                        )}
                    </div>

                    {/* Shipping address */}
                    {order.address && (
                        <div>
                            <h2 className="text-xs font-bold uppercase tracking-wider text-navy">Shipping Address</h2>
                            <p className="mt-3 text-sm leading-relaxed text-navy/70">
                                {order.address.fullName}<br />
                                {order.address.line1}
                                {order.address.line2 && `, ${order.address.line2}`}<br />
                                {order.address.city}, {order.address.state} {order.address.postalCode}<br />
                                {order.address.country}<br />
                                {order.address.phone}
                            </p>
                        </div>
                    )}

                    {/* Payment */}
                    <div>
                        <h2 className="text-xs font-bold uppercase tracking-wider text-navy">Payment</h2>
                        <p className="mt-3 text-sm text-navy/70">{order.paymentStatus}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}