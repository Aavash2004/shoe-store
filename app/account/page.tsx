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

  if (!userId) return null;

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

  // Compute profile completeness percentage
  let profileScore = 40; // Base: email & name exist
  if (userProfile?.addresses && userProfile.addresses.length > 0) profileScore += 30;
  if (ordersCount > 0) profileScore += 30;

  const greeting = getTimeGreeting();

  return (
    <div className="space-y-10">
      {/* Header Banner */}
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl text-[var(--color-navy)] font-bold mt-1">
          Your account at a glance.
        </h1>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {/* Orders Card */}
        <Link
          href="/account/orders"
          className="group block bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-2xl p-6 transition-all duration-300 hover:border-[var(--color-sky)] hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-navy)]/60">
              Orders
            </span>
            <div className="p-2 rounded-xl bg-[var(--color-sky)]/15 text-[var(--color-navy)]">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-navy)] mt-4">
            {ordersCount}
          </p>
          <div className="mt-4 flex items-center text-xs font-medium text-[var(--color-navy)] group-hover:text-[var(--color-sky)] transition-colors">
            <span>View orders</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        {/* Wishlist Card */}
        <Link
          href="/account/wishlist"
          className="group block bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-2xl p-6 transition-all duration-300 hover:border-[var(--color-sky)] hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-navy)]/60">
              Wishlist
            </span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-500">
              <Heart className="w-4 h-4" />
            </div>
          </div>
          <p className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-navy)] mt-4">
            {wishlistCount} <span className="text-sm font-normal text-[var(--color-navy)]/60">items</span>
          </p>
          <div className="mt-4 flex items-center text-xs font-medium text-[var(--color-navy)] group-hover:text-[var(--color-sky)] transition-colors">
            <span>View wishlist</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        {/* Profile Card */}
        <Link
          href="/account/profile"
          className="group block bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-2xl p-6 transition-all duration-300 hover:border-[var(--color-sky)] hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-navy)]/60">
              Profile
            </span>
            <div className="p-2 rounded-xl bg-[var(--color-sand)]/60 text-[var(--color-navy)]">
              <User className="w-4 h-4" />
            </div>
          </div>
          <p className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-navy)] mt-4">
            {profileScore}% <span className="text-sm font-normal text-[var(--color-navy)]/60">complete</span>
          </p>
          <div className="mt-4 flex items-center text-xs font-medium text-[var(--color-navy)] group-hover:text-[var(--color-sky)] transition-colors">
            <span>Edit profile</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>
      </div>

      {/* Recent Orders Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--color-navy)]">
            Recent Orders
          </h2>
          {recentOrders.length > 0 && (
            <Link
              href="/account/orders"
              className="text-xs font-medium text-[var(--color-navy)] hover:text-[var(--color-sky)] transition-colors"
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
              <p className="text-sm font-medium text-[var(--color-navy)]">
                You haven't placed any orders yet.
              </p>
              <p className="text-xs text-[var(--color-navy)]/60">
                Explore our footwear collection to make your first purchase.
              </p>
            </div>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-navy)] text-[var(--color-cream)] rounded-xl text-xs font-medium hover:bg-[var(--color-navy)]/90 transition-colors shadow-xs"
            >
              <span>Explore Shoes</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => {
              const statusColors: Record<string, string> = {
                PENDING: "bg-slate-100 text-slate-700 border-slate-300",
                CONFIRMED: "bg-blue-50 text-blue-700 border-blue-200",
                PROCESSING: "bg-amber-50 text-amber-700 border-amber-200",
                SHIPPED: "bg-sky-50 text-[var(--color-navy)] border-sky-200",
                DELIVERED: "bg-emerald-50 text-emerald-700 border-emerald-200",
                CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
              };

              const firstItem = order.items[0];
              const firstImg =
                firstItem?.variant?.product?.images?.[0]?.url ||
                "/images/Shoes/gmm.jpeg";

              return (
                <div
                  key={order.id}
                  className="bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:border-[var(--color-sand)]/80"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-stone-200 shrink-0 border border-[var(--color-sand)]">
                      <Image
                        src={firstImg}
                        alt={firstItem?.productName || "Product"}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[var(--color-navy)]">
                          #{order.orderNumber}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            statusColors[order.status] || "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-[var(--color-navy)] mt-1">
                        {firstItem?.productName || "Order Items"}
                        {order.items.length > 1 && (
                          <span className="text-xs text-[var(--color-navy)]/60 font-normal">
                            {" "}
                            +{order.items.length - 1} more
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-[var(--color-navy)]/60">
                        {new Date(order.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--color-sand)]/60">
                    <div className="text-left sm:text-right">
                      <span className="text-xs text-[var(--color-navy)]/60 block">Total</span>
                      <span className="font-semibold text-sm text-[var(--color-navy)]">
                        ${Number(order.total).toFixed(2)}
                      </span>
                    </div>

                    <Link
                      href={`/account/orders/${order.id}`}
                      className="px-4 py-2 bg-[var(--color-sand)]/60 hover:bg-[var(--color-sand)] text-[var(--color-navy)] rounded-xl text-xs font-medium transition-colors"
                    >
                      View Order
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="pt-4 text-center sm:text-left">
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-navy)] hover:text-[var(--color-sky)] transition-colors group"
        >
          <span>CONTINUE SHOPPING</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}