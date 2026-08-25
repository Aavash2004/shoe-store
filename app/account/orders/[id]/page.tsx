import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Truck,
  PackageCheck,
  ShoppingBag,
  MapPin,
  FileText,
} from "lucide-react";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/account/orders");
  }

  const { id } = await params;

  // Fetch single order strictly matching userId
  const order = await prisma.order.findFirst({
    where: {
      userId: session.user.id,
      OR: [{ id }, { orderNumber: id }],
    },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: {
                include: {
                  images: { where: { isPrimary: true }, take: 1 },
                },
              },
            },
          },
        },
      },
      address: true,
      statusHistory: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!order) {
    notFound();
  }

  // Ordered timeline stages
  const stages = [
    { key: "CONFIRMED", label: "Confirmed", icon: CheckCircle2 },
    { key: "PROCESSING", label: "Processing", icon: Clock },
    { key: "SHIPPED", label: "Shipped", icon: Truck },
    { key: "DELIVERED", label: "Delivered", icon: PackageCheck },
  ];

  const currentStatusIndex = stages.findIndex((s) => s.key === order.status);
  const isCancelled = order.status === "CANCELLED";

  return (
    <div className="space-y-8">
      {/* Back Link */}
      <div>
        <Link
          href="/account/orders"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-navy)]/70 hover:text-[var(--color-navy)] transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Orders</span>
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-navy)]">
              ORDER #{order.orderNumber}
            </h1>
            <p className="text-xs text-[var(--color-navy)]/60 mt-1">
              Placed on{" "}
              {new Date(order.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/track-order?orderNumber=${order.orderNumber}`}
              className="px-4 py-2 bg-[var(--color-sky)]/20 hover:bg-[var(--color-sky)]/30 text-[var(--color-navy)] font-semibold text-xs rounded-xl border border-[var(--color-sky)]/40 transition-colors"
            >
              Track Order
            </Link>
          </div>
        </div>
      </div>

      {/* SECTION 1: STATUS PROGRESS TIMELINE */}
      <div className="bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-2xl p-6 sm:p-8 space-y-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]/70">
          Fulfillment Status
        </h2>

        {isCancelled ? (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium">
            This order was cancelled.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative">
            {stages.map((stage, idx) => {
              const isCompleted = currentStatusIndex >= idx;
              const isCurrent = currentStatusIndex === idx;
              const StageIcon = stage.icon;

              const statusRecord = order.statusHistory.find(
                (h) => h.status === stage.key
              );

              return (
                <div
                  key={stage.key}
                  className={`flex flex-col items-center text-center p-4 rounded-xl border transition-all ${
                    isCurrent
                      ? "bg-[var(--color-navy)] text-[var(--color-cream)] border-[var(--color-navy)] shadow-md"
                      : isCompleted
                      ? "bg-[var(--color-cream)] text-[var(--color-navy)] border-[var(--color-sand)]"
                      : "bg-[var(--color-cream-alt)]/50 text-[var(--color-navy)]/40 border-[var(--color-sand)]/60"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${
                      isCurrent
                        ? "bg-[var(--color-sky)] text-[var(--color-navy)]"
                        : isCompleted
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-[var(--color-sand)]/40 text-[var(--color-navy)]/40"
                    }`}
                  >
                    <StageIcon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {stage.label}
                  </span>
                  {statusRecord && (
                    <span className="text-[10px] opacity-70 mt-1">
                      {new Date(statusRecord.createdAt).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric" }
                      )}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: ITEMS LIST */}
      <div className="bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-2 pb-4 border-b border-[var(--color-sand)]">
          <ShoppingBag className="w-5 h-5 text-[var(--color-navy)]" />
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--color-navy)]">
            Order Items ({order.items.length})
          </h2>
        </div>

        <div className="divide-y divide-[var(--color-sand)]/60">
          {order.items.map((item) => {
            const imgUrl =
              item.variant?.product?.images?.[0]?.url ||
              "/images/Shoes/s05.avif";

            return (
              <div
                key={item.id}
                className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-stone-200 shrink-0 border border-[var(--color-sand)]">
                    <Image
                      src={imgUrl}
                      alt={item.productName}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--color-navy)]">
                      {item.productName}
                    </h3>
                    <p className="text-xs text-[var(--color-navy)]/70 mt-0.5">
                      Size: {item.size} · Color: {item.color} · SKU: {item.sku}
                    </p>
                    <p className="text-xs text-[var(--color-navy)]/60 mt-0.5">
                      Qty: {item.quantity} × ${Number(item.price).toFixed(2)}
                    </p>
                  </div>
                </div>

                <span className="font-semibold text-sm text-[var(--color-navy)]">
                  ${(Number(item.price) * item.quantity).toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: ADDRESS & FINANCIAL BREAKDOWN GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Shipping Address */}
        <div className="bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[var(--color-sand)]">
            <MapPin className="w-4 h-4 text-[var(--color-navy)]" />
            <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-navy)]">
              Shipping Destination
            </h3>
          </div>

          {order.address ? (
            <div className="text-xs text-[var(--color-navy)]/80 space-y-1">
              <p className="font-semibold text-sm text-[var(--color-navy)]">
                {order.address.fullName}
              </p>
              <p>{order.address.line1}</p>
              {order.address.line2 && <p>{order.address.line2}</p>}
              <p>
                {order.address.city}, {order.address.state}{" "}
                {order.address.postalCode}
              </p>
              <p>{order.address.country}</p>
              <p className="pt-2 font-mono text-[var(--color-navy)]/60">
                Phone: {order.address.phone}
              </p>
            </div>
          ) : (
            <p className="text-xs text-[var(--color-navy)]/60">
              Standard Shipping
            </p>
          )}
        </div>

        {/* Financial Summary */}
        <div className="bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[var(--color-sand)]">
            <FileText className="w-4 h-4 text-[var(--color-navy)]" />
            <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-navy)]">
              Financial Summary
            </h3>
          </div>

          <div className="space-y-2 text-xs text-[var(--color-navy)]/80">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-medium">${Number(order.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span className="font-medium">
                {Number(order.shipping) === 0
                  ? "FREE"
                  : `$${Number(order.shipping).toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[var(--color-sand)] text-sm font-bold text-[var(--color-navy)]">
              <span>Total</span>
              <span>${Number(order.total).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="pt-4 flex justify-between items-center">
        <Link
          href="/shop"
          className="px-6 py-3 bg-[var(--color-navy)] text-[var(--color-cream)] text-xs font-semibold rounded-xl hover:bg-[var(--color-navy)]/90 transition-colors shadow-xs"
        >
          CONTINUE SHOPPING
        </Link>
      </div>
    </div>
  );
}