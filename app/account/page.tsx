import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { ShoppingBag, Heart, User, ArrowRight, PackageCheck } from "lucide-react";

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "GOOD MORNING";
  if (hour < 18) return "GOOD AFTERNOON";
  return "GOOD EVENING";
}

export default async function AccountPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return (
      <div className="max-w-xl mx-auto py-12 px-6 text-center space-y-6 bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-3xl shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-[var(--color-navy)]/10 text-[var(--color-navy)] flex items-center justify-center mx-auto">
          <User className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-navy)]">
            Your account, all in one place.
          </h1>
          <p className="text-sm text-[var(--color-navy)]/70 max-w-md mx-auto">
            Sign in to view your orders, wishlist, profile, and saved information.
          </p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/login"
            className="w-full sm:w-auto px-6 py-3 bg-[var(--color-navy)] text-[var(--color-cream)] font-semibold text-sm rounded-xl hover:bg-[var(--color-navy)]/90 transition-colors shadow-xs"
          >
            Sign In
          </Link>
          <Link
            href="/auth/register"
            className="w-full sm:w-auto px-6 py-3 bg-[var(--color-sand)]/60 hover:bg-[var(--color-sand)] text-[var(--color-navy)] font-semibold text-sm rounded-xl transition-colors"
          >
            Create Account
          </Link>
        </div>

        <div className="pt-2">
          <Link
            href="/shop"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-navy)]/60 hover:text-[var(--color-navy)] transition-colors"
          >
            <span>Continue browsing as guest</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  // Parallel database queries for customer metrics and latest orders
  const [ordersCount, wishlist, userProfile, recentOrders] = await Promise.all([
    prisma.order.count({ where: { userId } }),
    prisma.wishlist.findUnique({
      where: { userId },
      include: { _count: { select: { items: true } } },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        addresses: { take: 1 },
      },
    }),
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: {
        items: {
          take: 2,
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
      },
    }),
  ]);

  const wishlistCount = wishlist?._count.items || 0;
  const userName = userProfile?.name || session?.user?.name || "Customer";

  const greeting = getTimeGreeting();

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#6E7575]">
          {greeting}, {userName.split(" ")[0]}
        </span>
        <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-[var(--color-navy)] font-bold mt-1 tracking-tight">
          Your account at a glance.
        </h1>
      </div>

      {/* Summary Cards Grid (2 Balanced Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {/* Orders Card */}
        <Link
          href="/account/orders"
          className="group block bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-2xl p-6 transition-all duration-200 hover:border-[var(--color-navy)]/40 hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-navy)]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6E7575]">
              Orders
            </span>
            <div className="p-2.5 rounded-xl bg-[var(--color-sand)]/60 text-[var(--color-navy)] transition-colors group-hover:bg-[var(--color-navy)] group-hover:text-[var(--color-cream)]">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <p className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-navy)] mt-4 tracking-tight">
            {ordersCount} <span className="text-xs font-semibold text-[#6E7575]">total placed</span>
          </p>
          <div className="mt-4 flex items-center text-xs font-bold text-[var(--color-navy)] group-hover:text-[#FC563C] transition-colors">
            <span>View order history</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1.5 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        {/* Wishlist Card */}
        <Link
          href="/account/wishlist"
          className="group block bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-2xl p-6 transition-all duration-200 hover:border-[var(--color-navy)]/40 hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-navy)]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6E7575]">
              Wishlist
            </span>
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-500 transition-colors group-hover:bg-rose-500 group-hover:text-white">
              <Heart className="w-5 h-5" />
            </div>
          </div>
          <p className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-navy)] mt-4 tracking-tight">
            {wishlistCount} <span className="text-xs font-semibold text-[#6E7575]">items saved</span>
          </p>
          <div className="mt-4 flex items-center text-xs font-bold text-[var(--color-navy)] group-hover:text-[#FC563C] transition-colors">
            <span>View saved wishlist</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1.5 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>
      </div>

      {/* Recent Orders Section */}
      <div className="space-y-4 pt-1">
        <div className="flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-navy)]">
            Recent Orders
          </h2>
          {recentOrders.length > 0 && (
            <Link
              href="/account/orders"
              className="text-xs font-semibold text-[#6E7575] hover:text-[var(--color-navy)] transition-colors focus-visible:outline-none focus-visible:underline"
            >
              View all orders ({ordersCount})
            </Link>
          )}
        </div>

        {recentOrders.length === 0 ? (
          <div className="bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-2xl p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-sand)]/50 text-[var(--color-navy)]/60 flex items-center justify-center mx-auto">
              <PackageCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[var(--color-navy)]">
                You haven't placed any orders yet.
              </p>
              <p className="text-xs text-[#6E7575]">
                Explore our footwear collection to make your first purchase.
              </p>
            </div>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-navy)] text-[var(--color-cream)] rounded-xl text-xs font-semibold hover:bg-[var(--color-navy)]/90 transition-colors shadow-2xs"
            >
              <span>Explore Shoes</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => {
              const statusColors: Record<string, string> = {
                PENDING: "bg-stone-100 text-stone-700 border-stone-300",
                CONFIRMED: "bg-sky-50 text-[var(--color-navy)] border-sky-200",
                PROCESSING: "bg-amber-50 text-amber-800 border-amber-200",
                SHIPPED: "bg-sky-50 text-[var(--color-navy)] border-sky-200",
                DELIVERED: "bg-emerald-50 text-emerald-800 border-emerald-200",
                CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
              };

              const firstItem = order.items[0];
              const firstImg =
                firstItem?.variant?.product?.images?.[0]?.url ||
                "/images/Shoes/gmm.jpeg";

              return (
                <Link
                  key={order.id}
                  href={`/account/orders/${order.id}`}
                  className="group block bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-2xl p-4 sm:p-5 transition-all duration-200 hover:border-[var(--color-navy)]/40 hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-navy)]"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-stone-200 shrink-0 border border-[var(--color-sand)]">
                        <Image
                          src={firstImg}
                          alt={firstItem?.productName || "Product"}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[var(--color-navy)]">
                            #{order.orderNumber}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              statusColors[order.status] || "bg-stone-100 text-stone-700"
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-[var(--color-navy)] mt-1 truncate">
                          {firstItem?.productName || "Order Items"}
                          {order.items.length > 1 && (
                            <span className="text-xs text-[#6E7575] font-normal">
                              {" "}
                              +{order.items.length - 1} more
                            </span>
                          )}
                        </p>
                        {firstItem && (
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[#6E7575] mt-0.5">
                            <span>Qty: {firstItem.quantity}</span>
                            {firstItem.size && <span>· Size: {firstItem.size}</span>}
                            {firstItem.color && <span>· Color: {firstItem.color}</span>}
                          </div>
                        )}
                        <p className="text-[11px] text-[#6E7575] mt-0.5">
                          {new Date(order.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-[var(--color-sand)]/60">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E7575] block">
                          Total
                        </span>
                        <span className="font-bold text-sm text-[var(--color-navy)]">
                          ${Number(order.total).toFixed(2)}
                        </span>
                      </div>

                      <span className="px-3.5 py-1.5 bg-white/70 border border-[var(--color-sand)] text-[var(--color-navy)] rounded-xl text-xs font-semibold group-hover:bg-[var(--color-navy)] group-hover:text-[var(--color-cream)] transition-all duration-200 shadow-2xs">
                        View Order
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="pt-2 text-center sm:text-left">
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-[var(--color-navy)] hover:text-[#FC563C] transition-colors uppercase group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-navy)] rounded-lg py-1"
        >
          <span>CONTINUE SHOPPING</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}