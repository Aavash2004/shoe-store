"use client";

import { Suspense, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ShoppingBag, Heart, User, Menu, X, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { useCartStore } from "@/stores/cart-store";

interface SuggestionItem {
  id: string;
  name: string;
  slug: string;
  brand: string;
  category: string;
  image: string;
  price: number;
}

const links = [
  { href: "/shop", label: "Shop", category: null },
  { href: "/shop?category=Running", label: "Running", category: "Running" },
  { href: "/shop?category=Lifestyle", label: "Lifestyle", category: "Lifestyle" },
];

function HeaderInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";

  useEffect(() => {
    setSearchQuery(searchParams.get("q") || "");
  }, [searchParams]);

  // Debounced search autocomplete fetch
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 1) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsFetchingSuggestions(true);
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        setSuggestions(data.suggestions ?? []);
        setShowDropdown(true);
      } catch (err) {
        console.error("Autocomplete fetch error:", err);
      } finally {
        setIsFetchingSuggestions(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setShowDropdown(false);
    const trimmed = searchQuery.trim();
    const params = new URLSearchParams(searchParams.toString());
    if (trimmed) {
      params.set("q", trimmed);
    } else {
      params.delete("q");
    }
    startTransition(() => {
      router.push(`/shop?${params.toString()}`);
    });
  }

  function handleClearSearch() {
    setSearchQuery("");
    setSuggestions([]);
    setShowDropdown(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    startTransition(() => {
      router.push(params.toString() ? `/shop?${params.toString()}` : "/shop");
    });
  }

  const localCount = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0)
  );

  const [dbCount, setDbCount] = useState(0);

  useEffect(() => {
    if (!isLoggedIn) return;

    function fetchCount() {
      fetch("/api/cart")
        .then((res) => res.json())
        .then((data) => {
          const count = (data.items ?? []).reduce(
            (sum: number, item: { quantity: number }) => sum + item.quantity,
            0
          );
          setDbCount(count);
        });
    }

    fetchCount();
    window.addEventListener("cart-updated", fetchCount);
    return () => window.removeEventListener("cart-updated", fetchCount);
  }, [isLoggedIn]);

  const cartCount = isLoggedIn ? dbCount : localCount;

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setShowDropdown(false);
  }, [pathname, searchParams]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Close on Escape
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
          className="font-[family-name:var(--font-display)] text-xl font-extrabold tracking-wider text-[var(--color-navy)] transition-opacity hover:opacity-80 md:text-2xl"
        >
          ABXV
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
                className={`relative text-sm font-medium transition-colors after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-[var(--color-navy)] after:transition-transform after:duration-200 hover:after:scale-x-100 ${active
                    ? "text-[var(--color-navy)] after:scale-x-100"
                    : "text-[var(--color-navy)]/60 hover:text-[var(--color-navy)]"
                  }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Search Bar & Icons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Header Search Form & Autocomplete Container */}
          <div ref={searchRef} className="relative flex items-center">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                disabled={isPending}
                onFocus={() => {
                  if (searchQuery.trim().length >= 1 && suggestions.length > 0) {
                    setShowDropdown(true);
                  }
                }}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isPending ? "Searching..." : "Search shoes..."}
                className={`w-32 sm:w-48 md:w-56 rounded-full border border-[var(--color-sand)] bg-[var(--color-cream-alt)]/80 px-3.5 py-1.5 pl-8 text-xs text-[var(--color-navy)] placeholder:[var(--color-navy)]/40 focus:w-44 sm:focus:w-60 focus:border-[var(--color-navy)]/40 focus:bg-white focus:outline-none transition-all duration-300 shadow-2xs ${
                  isPending ? "opacity-60 cursor-not-allowed" : ""
                }`}
              />
              {isPending || isFetchingSuggestions ? (
                <Loader2 className="absolute left-2.5 h-3.5 w-3.5 text-[var(--color-navy)]/60 animate-spin pointer-events-none" />
              ) : (
                <Search className="absolute left-2.5 h-3.5 w-3.5 text-[var(--color-navy)]/50 pointer-events-none" />
              )}
              {searchQuery && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleClearSearch}
                  className="absolute right-2.5 p-0.5 text-[var(--color-navy)]/40 hover:text-[var(--color-navy)] transition-colors disabled:opacity-40"
                  aria-label="Clear search query"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </form>

            {/* Live Search Autocomplete Dropdown Menu */}
            {showDropdown && (
              <div className="absolute top-full right-0 mt-2.5 w-72 sm:w-80 rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream)] p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-navy)]/50 border-b border-[var(--color-sand)]/60 flex items-center justify-between">
                  <span>Product Suggestions</span>
                  {suggestions.length > 0 && (
                    <span className="text-[9px] font-medium text-[var(--color-navy)]/40">
                      {suggestions.length} match{suggestions.length === 1 ? "" : "es"}
                    </span>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto py-1 divide-y divide-[var(--color-sand)]/30">
                  {suggestions.length > 0 ? (
                    suggestions.map((item) => (
                      <Link
                        key={item.id}
                        href={`/products/${item.slug}`}
                        onClick={() => setShowDropdown(false)}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--color-sand)]/50 transition-colors group"
                      >
                        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[var(--color-cream-alt)] border border-[var(--color-sand)]/60">
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-200"
                            sizes="44px"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[var(--color-navy)] truncate group-hover:text-[var(--color-sky)] transition-colors">
                            {item.name}
                          </p>
                          <p className="text-[10px] font-medium text-[var(--color-navy)]/50 truncate">
                            {item.brand} · {item.category}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-[var(--color-navy)]">
                            ${item.price.toFixed(2)}
                          </span>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="py-4 px-3 text-center text-xs text-[var(--color-navy)]/60">
                      No matching shoes found for &ldquo;{searchQuery}&rdquo;
                    </div>
                  )}
                </div>

                {/* View All Search Results Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    setShowDropdown(false);
                    handleSearchSubmit(e);
                  }}
                  className="w-full mt-1.5 py-2 px-3 rounded-xl bg-[var(--color-navy)] text-[var(--color-cream)] text-xs font-semibold hover:bg-[var(--color-navy)]/90 transition-colors flex items-center justify-between"
                >
                  <span>View all results for &ldquo;{searchQuery}&rdquo;</span>
                  <span>→</span>
                </button>
              </div>
            )}
          </div>

          {/* Wishlist */}
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="hidden sm:inline-flex rounded-full text-[var(--color-navy)] hover:bg-[var(--color-sand)]/40 hover:text-[var(--color-navy)] focus-visible:ring-2 focus-visible:ring-[var(--color-navy)] focus-visible:ring-offset-1"
          >
            <Link href="/account/wishlist" aria-label="Wishlist">
              <Heart className="h-5 w-5" strokeWidth={1.5} />
            </Link>
          </Button>

          {/* Account / Login */}
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="rounded-full text-[var(--color-navy)] hover:bg-[var(--color-sand)]/40 hover:text-[var(--color-navy)] focus-visible:ring-2 focus-visible:ring-[var(--color-navy)] focus-visible:ring-offset-1"
          >
            <Link
              href={
                session?.user
                  ? session.user.role === "ADMIN"
                    ? "/admin"
                    : "/account"
                  : "/login"
              }
              aria-label={
                session?.user
                  ? session.user.role === "ADMIN"
                    ? "Admin Console"
                    : "Account Dashboard"
                  : "Log in"
              }
            >
              <User className="h-5 w-5" strokeWidth={1.5} />
            </Link>
          </Button>

          {/* Cart */}
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="relative rounded-full text-[var(--color-navy)] hover:bg-[var(--color-sand)]/40 hover:text-[var(--color-navy)] focus-visible:ring-2 focus-visible:ring-[var(--color-navy)] focus-visible:ring-offset-1"
          >
            <Link
              href="/cart"
              aria-label={`Cart${cartCount ? `, ${cartCount} items` : ""}`}
            >
              <ShoppingBag className="h-5 w-5" strokeWidth={1.5} />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-[#FC563C] px-1 text-[10px] font-bold leading-none text-white border-2 border-[var(--color-cream)] shadow-xs">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>
          </Button>

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden rounded-full text-[var(--color-navy)] hover:bg-[var(--color-sand)]/40 focus-visible:ring-2 focus-visible:ring-[var(--color-navy)]"
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
        className={`overflow-hidden border-t border-[var(--color-sand)]/70 bg-[var(--color-cream)] transition-[max-height,opacity] duration-300 ease-in-out md:hidden ${mobileOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
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
                className={`border-b border-[var(--color-sand)]/40 py-3 text-base font-medium last:border-b-0 ${active
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
              href={
                session?.user
                  ? session.user.role === "ADMIN"
                    ? "/admin"
                    : "/account"
                  : "/login"
              }
              className="flex items-center gap-2 text-sm font-medium text-[var(--color-navy)]/70"
            >
              <User className="h-4 w-4" strokeWidth={1.5} />
              {session?.user
                ? session.user.role === "ADMIN"
                  ? "Admin Console"
                  : "Account"
                : "Log in"}
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

export function Header() {
  return (
    <Suspense fallback={<header className="sticky top-0 z-50 h-16 bg-[var(--color-cream)] border-b border-[var(--color-sand)]/70 md:h-[72px]" />}>
      <HeaderInner />
    </Suspense>
  );
}