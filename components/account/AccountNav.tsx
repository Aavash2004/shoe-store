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

export function AccountNav() {
  const pathname = usePathname();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await signOut({ callbackUrl: "/" });
  }

  const navItems = [
    {
      name: "Overview",
      href: "/account",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      name: "Orders",
      href: "/account/orders",
      icon: ShoppingBag,
      exact: false,
    },
    {
      name: "Wishlist",
      href: "/account/wishlist",
      icon: Heart,
      exact: false,
    },
    {
      name: "Profile & Addresses",
      href: "/account/profile",
      icon: User,
      exact: false,
    },
  ];

  const isLinkActive = (item: (typeof navItems)[0]) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <>
      {/* Mobile Horizontal Navigation Bar */}
      <div className="md:hidden -mx-4 px-4 pb-3 mb-6 border-b border-[var(--color-sand)] flex items-center gap-2 overflow-x-auto no-scrollbar">
        {navItems.map((item) => {
          const active = isLinkActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-navy)] ${
                active
                  ? "bg-[var(--color-navy)] text-[var(--color-cream)] shadow-xs"
                  : "bg-[var(--color-cream-alt)] text-[#6E7575] border border-[var(--color-sand)] hover:bg-[var(--color-sand)]/50 hover:text-[var(--color-navy)]"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setShowLogoutConfirm(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          <span>Logout</span>
        </button>
      </div>

      {/* Desktop Left Sidebar */}
      <aside className="hidden md:block w-60 shrink-0">
        <div className="bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-2xl p-5 shadow-xs space-y-5">
          <div className="pb-3 border-b border-[var(--color-sand)]">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-navy)] tracking-tight">
              My Account
            </h2>
            <p className="text-[11px] text-[#6E7575] mt-0.5 font-medium">
              Storefront Customer Portal
            </p>
          </div>

          <nav className="space-y-1" aria-label="Account navigation">
            {navItems.map((item) => {
              const active = isLinkActive(item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-navy)] ${
                    active
                      ? "bg-[var(--color-navy)] text-[var(--color-cream)] shadow-xs"
                      : "text-[#6E7575] hover:bg-[var(--color-sand)]/40 hover:text-[var(--color-navy)]"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      active
                        ? "text-[var(--color-sky)]"
                        : "text-[#6E7575]"
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}

            <div className="pt-3 mt-3 border-t border-[var(--color-sand)]">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50/80 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
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
