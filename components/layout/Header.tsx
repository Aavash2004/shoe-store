"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ShoppingBag, Heart, User, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/shop", label: "Shop", category: null },
  { href: "/shop?category=Running", label: "Running", category: "Running" },
  { href: "/shop?category=Lifestyle", label: "Lifestyle", category: "Lifestyle" },
];

// Swap in your real cart count (context, store, server data, etc).
function useCartCount() {
  return 0;
}

export function Header() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category");
  const cartCount = useCartCount();

  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile menu on route/query change.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, searchParams]);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Close on Escape.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const isLinkActive = (link: (typeof links)[number]) => {
    if (pathname !== "/shop") return false;
    if (link.category === null) return !activeCategory;
    return activeCategory === link.category;
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-sand)]/70 bg-[var(--color-cream)]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:h-[72px] md:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-xl tracking-tight text-[var(--color-navy)] transition-opacity hover:opacity-80 md:text-2xl"
        >
          Shoe Store
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => {
            const active = isLinkActive(link);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`relative text-sm font-medium transition-colors after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-[var(--color-navy)] after:transition-transform after:duration-200 hover:after:scale-x-100 ${
                  active
                    ? "text-[var(--color-navy)] after:scale-x-100"
                    : "text-[var(--color-navy)]/60 hover:text-[var(--color-navy)]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Icons */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild className="hidden sm:inline-flex">
            <Link href="/account/wishlist" aria-label="Wishlist">
              <Heart className="h-5 w-5" strokeWidth={1.5} />
            </Link>
          </Button>

          <Button variant="ghost" size="icon" asChild className="hidden sm:inline-flex">
            <Link href="/account" aria-label="Account">
              <User className="h-5 w-5" strokeWidth={1.5} />
            </Link>
          </Button>

          <Button variant="ghost" size="icon" asChild className="relative">
            <Link href="/cart" aria-label={`Cart${cartCount ? `, ${cartCount} items` : ""}`}>
              <ShoppingBag className="h-5 w-5" strokeWidth={1.5} />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-navy)] px-1 text-[10px] font-semibold leading-none text-[var(--color-cream)]">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>
          </Button>

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" strokeWidth={1.5} />
            ) : (
              <Menu className="h-5 w-5" strokeWidth={1.5} />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile menu panel */}
      <div
        id="mobile-menu"
        className={`overflow-hidden border-t border-[var(--color-sand)]/70 bg-[var(--color-cream)] transition-[max-height,opacity] duration-300 ease-in-out md:hidden ${
          mobileOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <nav className="flex flex-col px-4 py-2">
          {links.map((link) => {
            const active = isLinkActive(link);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`border-b border-[var(--color-sand)]/40 py-3 text-base font-medium last:border-b-0 ${
                  active
                    ? "text-[var(--color-navy)]"
                    : "text-[var(--color-navy)]/70"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          <div className="flex items-center gap-2 py-3 sm:hidden">
            <Link
              href="/account/wishlist"
              className="flex items-center gap-2 text-sm font-medium text-[var(--color-navy)]/70"
            >
              <Heart className="h-4 w-4" strokeWidth={1.5} />
              Wishlist
            </Link>
            <span className="text-[var(--color-navy)]/30">·</span>
            <Link
              href="/account"
              className="flex items-center gap-2 text-sm font-medium text-[var(--color-navy)]/70"
            >
              <User className="h-4 w-4" strokeWidth={1.5} />
              Account
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}