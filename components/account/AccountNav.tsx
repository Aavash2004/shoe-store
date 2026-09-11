"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  ShoppingBag,
  Heart,
  User,
  LogOut,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWishlistStore } from "@/stores/wishlist-store";

import type { Route } from "next";

interface NavItem {
  name: string;
  href: Route;
  icon: React.ComponentType<{ className?: string }>;
  exact: boolean;
}

export function AccountNav() {
  const pathname = usePathname();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const wishlistCount = useWishlistStore((state) => state.wishlistIds.length);

  async function handleLogout() {
    setLoading(true);
    await signOut({ callbackUrl: "/" });
  }

  const navItems: NavItem[] = [
    {
      name: "Overview",
      href: "/account" as Route,
      icon: LayoutDashboard,
      exact: true,
    },
    {
      name: "Orders",
      href: "/account/orders" as Route,
      icon: ShoppingBag,
      exact: false,
    },
    {
      name: "Wishlist",
      href: "/account/wishlist" as Route,
      icon: Heart,
      exact: false,
    },
    {
      name: "Profile & Addresses",
      href: "/account/profile" as Route,
      icon: User,
      exact: false,
    },
  ];

  const isLinkActive = (item: NavItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <>
      {/* Mobile Horizontal Segmented Luxury Nav Bar */}
      <div className="md:hidden -mx-4 px-4 mb-6">
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[var(--color-sand)]/35 border border-[var(--color-sand)]/70 backdrop-blur-md overflow-x-auto no-scrollbar shadow-2xs">
          {navItems.map((item) => {
            const active = isLinkActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 focus-visible:outline-none ${
                  active
                    ? "bg-[var(--color-navy)] text-white shadow-xs"
                    : "text-[var(--color-navy)]/65 hover:text-[var(--color-navy)] hover:bg-white/60 active:scale-95"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? "text-[var(--color-sky)]" : "text-[var(--color-navy)]/50"}`} />
                <span>{item.name}</span>
                {item.name === "Wishlist" && wishlistCount > 0 && (
                  <span className={`flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold shadow-xs ${
                    active ? "bg-[#FC563C] text-white" : "bg-[var(--color-navy)] text-white"
                  }`}>
                    {wishlistCount > 99 ? "99+" : wishlistCount}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="h-4 w-px bg-[var(--color-sand)] shrink-0 mx-1" />

          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors text-rose-600/80 hover:text-rose-600 hover:bg-rose-50/80 shrink-0"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Desktop Left Sidebar */}
      <aside className="hidden md:block w-64 shrink-0">
        <div className="bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-3xl p-5 shadow-xs space-y-6">
          <div className="pb-4 border-b border-[var(--color-sand)] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-navy)]/50">
                Customer Portal
              </span>
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-navy)] tracking-tight">
                My Account
              </h2>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" title="Active Session" />
          </div>

          <nav className="space-y-1.5" aria-label="Account navigation">
            {navItems.map((item) => {
              const active = isLinkActive(item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-navy)] ${
                    active
                      ? "bg-[var(--color-navy)] text-white shadow-xs"
                      : "text-[#6E7575] hover:bg-white/80 hover:text-[var(--color-navy)]"
                  }`}
                >
                  <div className={`p-1.5 rounded-xl transition-colors ${
                    active
                      ? "bg-white/15 text-[var(--color-sky)]"
                      : "bg-[var(--color-sand)]/40 text-[#6E7575] group-hover:text-[var(--color-navy)] group-hover:bg-[var(--color-sand)]/70"
                  }`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="flex-1 font-medium">{item.name}</span>
                  {item.name === "Wishlist" && wishlistCount > 0 && (
                    <span className={`flex h-4.5 min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold shadow-xs ${
                      active ? "bg-[#FC563C] text-white" : "bg-[var(--color-navy)] text-white"
                    }`}>
                      {wishlistCount > 99 ? "99+" : wishlistCount}
                    </span>
                  )}
                </Link>
              );
            })}

            <div className="pt-3 mt-3 border-t border-[var(--color-sand)]">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold text-rose-600 hover:bg-rose-50/80 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 group"
              >
                <div className="p-1.5 rounded-xl bg-rose-100/60 text-rose-600 group-hover:bg-rose-100 transition-colors">
                  <LogOut className="w-3.5 h-3.5" />
                </div>
                <span>Log Out</span>
              </button>
            </div>
          </nav>
        </div>
      </aside>

      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className="max-w-[380px] gap-0 overflow-hidden rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream)] p-0 shadow-lg">
          <div className="px-6 pt-6 pb-4">
            <DialogHeader className="space-y-1.5 text-left">
              <DialogTitle className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-[var(--color-navy)]">
                Log out?
              </DialogTitle>
              <DialogDescription className="text-xs leading-relaxed text-[#6E7575]">
                You&apos;ll need to sign in again to access your orders and profile.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[var(--color-sand)] bg-[var(--color-cream-alt)] px-6 py-3">
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(false)}
              disabled={loading}
              className="h-8 rounded-lg px-3.5 text-xs font-semibold text-[#6E7575] transition hover:text-[var(--color-navy)] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loading}
              className="h-8 rounded-lg bg-[var(--color-navy)] px-3.5 text-xs font-semibold text-[var(--color-cream)] transition hover:bg-[var(--color-navy)]/90 disabled:opacity-60"
            >
              {loading ? "Logging out…" : "Log Out"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
