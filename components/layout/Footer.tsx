import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-sand)] bg-[var(--color-cream-alt)]">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-xl text-[var(--color-navy)]">
              Shoe Store
            </h3>
            <p className="mt-2 text-sm text-[var(--color-navy)]/70">
              Premium shoes, thoughtfully made.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[var(--color-navy)]">Shop</h4>
            <ul className="mt-3 space-y-2 text-sm text-[var(--color-navy)]/70">
              <li><Link href="/shop">All shoes</Link></li>
              <li><Link href="/shop?category=running">Running</Link></li>
              <li><Link href="/shop?category=lifestyle">Lifestyle</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[var(--color-navy)]">Account</h4>
            <ul className="mt-3 space-y-2 text-sm text-[var(--color-navy)]/70">
              <li><Link href="/account/orders">Orders</Link></li>
              <li><Link href="/account/wishlist">Wishlist</Link></li>
              <li><Link href="/track-order">Track order</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[var(--color-navy)]">Support</h4>
            <ul className="mt-3 space-y-2 text-sm text-[var(--color-navy)]/70">
              <li><Link href="#">Contact</Link></li>
              <li><Link href="#">Shipping</Link></li>
              <li><Link href="#">Returns</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-[var(--color-sand)] pt-6 text-center text-xs text-[var(--color-navy)]/60">
          © {new Date().getFullYear()} Shoe Store. All rights reserved.
        </div>
      </div>
    </footer>
  );
}