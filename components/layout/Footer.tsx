import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="relative mx-4 mb-4 overflow-hidden rounded-t-3xl px-5 pt-10 pb-5 text-center">
  <Image
    src="/images/hero/bg.avif"
    alt="Shoe display"
    fill
    priority={false}
    className="object-cover object-center scale-105"
  />
  {/* Soft gradient overlay for depth + better text readability */}
  <div className="absolute inset-0 bg-gradient-to-t from-black" />

  <div className="relative z-10">
    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white p-1 shadow-md border border-white/20">
      <Image src="/logo.png" alt="ABXV Logo" width={40} height={40} className="object-contain" />
    </div>
    <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight text-white md:text-4xl font-extrabold">
      Step Into
    </h2>
    <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--color-sky)] md:text-4xl font-extrabold">
      Something Bold
    </h2>

    <div className="mt-7 flex flex-col justify-between gap-6 text-left sm:flex-row sm:gap-8">
      <div>
        <p className="text-xs uppercase tracking-wider text-[var(--color-cream)]/50">
          Shop
        </p>
        <ul className="mt-2 space-y-1.5 text-sm text-[var(--color-cream)]">
          <li>
            <Link href="/shop" className="hover:text-[var(--color-accent)] transition-colors">
              All shoes
            </Link>
          </li>
          <li>
            <Link href="/shop?category=running" className="hover:text-[var(--color-accent)] transition-colors">
              Running
            </Link>
          </li>
          <li>
            <Link href="/shop?category=lifestyle" className="hover:text-[var(--color-accent)] transition-colors">
              Lifestyle
            </Link>
          </li>
        </ul>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wider text-[var(--color-cream)]/50">
          Account
        </p>
        <ul className="mt-2 space-y-1.5 text-sm text-[var(--color-cream)]">
          <li>
            <Link href="/account/orders" className="hover:text-[var(--color-accent)] transition-colors">
              Orders
            </Link>
          </li>
          <li>
            <Link href="/account/wishlist" className="hover:text-[var(--color-accent)] transition-colors">
              Wishlist
            </Link>
          </li>
          <li>
            <Link href="/track-order" className="hover:text-[var(--color-accent)] transition-colors">
              Track order
            </Link>
          </li>
        </ul>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wider text-[var(--color-cream)]/50">
          Support
        </p>
        <ul className="mt-2 space-y-1.5 text-sm text-[var(--color-cream)]">
          <li>
            <Link href="#" className="hover:text-[var(--color-accent)] transition-colors">
              Contact
            </Link>
          </li>
          <li>
            <Link href="#" className="hover:text-[var(--color-accent)] transition-colors">
              Shipping
            </Link>
          </li>
          <li>
            <Link href="#" className="hover:text-[var(--color-accent)] transition-colors">
              Returns
            </Link>
          </li>
        </ul>
      </div>
    </div>

    <div className="mt-8 border-t border-[var(--color-cream)]/15 pt-4 text-[11px] text-[var(--color-cream)]/45">
      © {new Date().getFullYear()} ABXV. All rights reserved.
    </div>
  </div>
</footer>
  );
}