import Link from "next/link";
import Image from "next/image";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative w-full overflow-hidden bg-[#07080A] text-white select-none">
      {/* Background Image of shoes shelf with atmospheric spotlight lighting */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Image
          src="/images/hero/bg.avif"
          alt="ABXV Sneaker Display"
          fill
          priority={false}
          className="object-cover object-bottom opacity-80 md:opacity-90"
          sizes="100vw"
        />
        {/* Cinematic gradient: dark vignette at top and sides, clear spotlight on shoes */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#07080A] via-[#07080A]/60 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,transparent_0%,rgba(7,8,10,0.65)_70%,#07080A_100%)]" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 mx-auto max-w-6xl px-6 pt-8 pb-4 md:pt-10 md:pb-6">
        {/* Brand Header */}
        <div className="text-center flex flex-col items-center">
          {/* Logo Badge */}
          <Link
            href="/"
            className="group mb-2.5 flex h-9 w-9 items-center justify-center transition-transform duration-300 hover:scale-105"
            aria-label="ABXV Home"
          >
            <div className="relative h-9 w-9 overflow-hidden drop-shadow-[0_2px_10px_rgba(252,86,60,0.35)]">
              <Image
                src="/images/Shoes/logo.png"
                alt="ABXV Logo"
                fill
                className="object-contain"
                sizes="36px"
              />
            </div>
          </Link>

          {/* Heading */}
          <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold tracking-tight text-white sm:text-2xl md:text-3xl leading-tight">
            Step Into
          </h2>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold tracking-tight text-[#38BDF8] sm:text-2xl md:text-3xl leading-tight drop-shadow-[0_2px_14px_rgba(56,189,248,0.4)]">
            Something Bold.
          </h2>

          {/* Subtitle */}
          <p className="mt-1 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-400">
            BUILT FOR EVERY STEP.
          </p>
        </div>

        {/* 3 Columns Navigation (Shop / Account / Support) */}
        <div className="mt-6 md:mt-8 mx-auto grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-6">
          {/* Column 1: Shop */}
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left sm:justify-self-start sm:pl-4 md:pl-8">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-200">
              Shop
            </h3>
            {/* Orange Accent Bar */}
            <span className="mt-1 mb-2.5 block h-[2px] w-5 rounded-full bg-[#FC563C] shadow-[0_0_8px_rgba(252,86,60,0.7)]" />
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link
                  href="/shop"
                  className="text-neutral-300 transition-colors duration-200 hover:text-white"
                >
                  All Shoes
                </Link>
              </li>
              <li>
                <Link
                  href="/shop?category=running"
                  className="text-neutral-300 transition-colors duration-200 hover:text-white"
                >
                  Running
                </Link>
              </li>
              <li>
                <Link
                  href="/shop?category=lifestyle"
                  className="text-neutral-300 transition-colors duration-200 hover:text-white"
                >
                  Lifestyle
                </Link>
              </li>
              <li>
                <Link
                  href="/shop?sort=newest"
                  className="text-neutral-300 transition-colors duration-200 hover:text-white"
                >
                  New Arrivals
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Account */}
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left sm:justify-self-center">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-200">
              Account
            </h3>
            {/* Orange Accent Bar */}
            <span className="mt-1 mb-2.5 block h-[2px] w-5 rounded-full bg-[#FC563C] shadow-[0_0_8px_rgba(252,86,60,0.7)]" />
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link
                  href="/account"
                  className="text-neutral-300 transition-colors duration-200 hover:text-white"
                >
                  My Account
                </Link>
              </li>
              <li>
                <Link
                  href="/account/orders"
                  className="text-neutral-300 transition-colors duration-200 hover:text-white"
                >
                  Orders
                </Link>
              </li>
              <li>
                <Link
                  href="/account/wishlist"
                  className="text-neutral-300 transition-colors duration-200 hover:text-white"
                >
                  Wishlist
                </Link>
              </li>
              <li>
                <Link
                  href="/track-order"
                  className="text-neutral-300 transition-colors duration-200 hover:text-white"
                >
                  Track Order
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Support */}
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left sm:justify-self-end sm:pr-4 md:pr-8">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-200">
              Support
            </h3>
            {/* Orange Accent Bar */}
            <span className="mt-1 mb-2.5 block h-[2px] w-5 rounded-full bg-[#FC563C] shadow-[0_0_8px_rgba(252,86,60,0.7)]" />
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link
                  href={"/shipping-policy" as any}
                  className="text-neutral-300 transition-colors duration-200 hover:text-white"
                >
                  Shipping
                </Link>
              </li>
              <li>
                <Link
                  href={"/returns" as any}
                  className="text-neutral-300 transition-colors duration-200 hover:text-white"
                >
                  Returns
                </Link>
              </li>
              <li>
                <Link
                  href={"/contact#faq" as any}
                  className="text-neutral-300 transition-colors duration-200 hover:text-white"
                >
                  FAQs
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Compact bottom shelf clearance */}
        <div className="h-6 sm:h-8 md:h-10 w-full" aria-hidden="true" />
      </div>

      {/* Bottom Bar */}
      <div className="relative z-10 border-t border-white/[0.08] bg-[#050608]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-3 sm:flex-row text-[10px] text-neutral-400">
          {/* Left: Brand Monogram Icon + Copyright */}
          <div className="flex items-center gap-2">
            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-neutral-600/70 text-[8px] font-bold text-neutral-300 select-none">
              N
            </span>
            <span>© {currentYear} ABXV. All rights reserved.</span>
          </div>

          {/* Right: Policy Links */}
          <div className="flex items-center gap-3">
            <Link
              href={"/privacy" as any}
              className="text-neutral-400 transition-colors duration-200 hover:text-white"
            >
              Privacy Policy
            </Link>
            <span className="text-neutral-600 select-none">·</span>
            <Link
              href={"/terms" as any}
              className="text-neutral-400 transition-colors duration-200 hover:text-white"
            >
              Terms of Service
            </Link>
            <span className="text-neutral-600 select-none">·</span>
            <Link
              href={"/contact" as any}
              className="text-neutral-400 transition-colors duration-200 hover:text-white"
            >
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}