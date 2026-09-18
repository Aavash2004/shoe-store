import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { OrderStatusControl } from "@/components/admin/OrderStatusControl";
import { formatCurrency } from "@/lib/constants/currencies";

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
                                        {formatCurrency(Number(item.price) * item.quantity, order.currency)}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex flex-col gap-1 border-t border-sand pt-4 text-sm">
                            <div className="flex justify-between text-navy/60">
                                <span>Subtotal</span>
                                <span>{formatCurrency(Number(order.subtotal), order.currency)}</span>
                            </div>
                            <div className="flex justify-between text-navy/60">
                                <span>Shipping</span>
                                <span>
                                    {Number(order.shipping) === 0
                                        ? "FREE"
                                        : formatCurrency(Number(order.shipping), order.currency)}
                                </span>
                            </div>
                            <div className="flex justify-between font-medium text-navy">
                                <span>Total</span>
                                <span>{formatCurrency(Number(order.total), order.currency)}</span>
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

                    {/* Payment Information */}
                    <div className="rounded-xl border border-sand bg-cream-alt/40 p-4">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-navy">Payment Details</h2>
                        
                        <div className="mt-3 space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-navy/60">Method:</span>
                                <span className="font-semibold text-navy">
                                    {order.paymentMethod === "STRIPE"
                                        ? "Credit / Debit Card (Stripe)"
                                        : order.paymentMethod === "KHALTI"
                                        ? "Khalti Digital Wallet"
                                        : order.paymentMethod === "COD"
                                        ? "Cash on Delivery"
                                        : order.paymentMethod || "N/A"}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-navy/60">Payment Status:</span>
                                <span
                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                        order.paymentStatus === "PAID"
                                            ? "bg-emerald-100 text-emerald-800"
                                            : order.paymentStatus === "FAILED"
                                            ? "bg-rose-100 text-rose-800"
                                            : "bg-amber-100 text-amber-800"
                                    }`}
                                >
                                    {order.paymentStatus}
                                </span>
                            </div>

                            {order.stripePaymentIntentId && (
                                <div className="pt-2 border-t border-sand/60">
                                    <span className="text-xs text-navy/50 block">Stripe Payment Intent:</span>
                                    <a
                                        href={`https://dashboard.stripe.com/test/payments/${order.stripePaymentIntentId}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs font-mono text-sky-700 hover:underline break-all block mt-0.5"
                                    >
                                        {order.stripePaymentIntentId} ↗
                                    </a>
                                </div>
                            )}

                            {order.khaltiPidx && (
                                <div className="pt-2 border-t border-sand/60">
                                    <span className="text-xs text-navy/50 block">Khalti PIDX:</span>
                                    <span className="text-xs font-mono text-purple-800 break-all block mt-0.5">
                                        {order.khaltiPidx}
                                    </span>
                                </div>
                            )}

                            {order.transactionId && !order.stripePaymentIntentId && !order.khaltiPidx && (
                                <div className="pt-2 border-t border-sand/60">
                                    <span className="text-xs text-navy/50 block">Transaction ID:</span>
                                    <span className="text-xs font-mono text-navy/70 break-all block mt-0.5">
                                        {order.transactionId}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}