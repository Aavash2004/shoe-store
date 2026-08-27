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
      <div className="md:hidden -mx-4 px-4 pb-2 mb-6 border-b border-[var(--color-sand)] flex flex-wrap gap-2">
        {navItems.map((item) => {
          const active = isLinkActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                active
                  ? "bg-[var(--color-navy)] text-[var(--color-cream)] border-[var(--color-navy)] shadow-xs"
                  : "bg-[var(--color-cream-alt)] text-[var(--color-navy)]/80 border-[var(--color-sand)] hover:bg-[var(--color-sand)]/40"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.name}</span>
            </Link>
          );
        })}

        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>
      </div>

      {/* Desktop Left Sidebar */}
      <aside className="hidden md:block w-64 shrink-0 space-y-8">
        <div className="bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-2xl p-6 shadow-xs space-y-6">
          <div className="pb-4 border-b border-[var(--color-sand)]">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--color-navy)] tracking-tight">
              My Account
            </h2>
            <p className="text-xs text-[var(--color-navy)]/60 mt-0.5">
              Storefront Customer Portal
            </p>
          </div>

          <nav className="space-y-1.5" aria-label="Account navigation">
            {navItems.map((item) => {
              const active = isLinkActive(item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-[var(--color-navy)] text-[var(--color-cream)] shadow-sm font-semibold"
                      : "text-[var(--color-navy)]/80 hover:bg-[var(--color-sand)]/40 hover:text-[var(--color-navy)]"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      active
                        ? "text-[var(--color-sky)]"
                        : "text-[var(--color-navy)]/50"
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}

            <div className="pt-4 mt-4 border-t border-[var(--color-sand)]">
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors text-left"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                <span>Log Out</span>
              </button>
            </div>
          </nav>
        </div>
      </aside>

      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className="max-w-[400px] gap-0 overflow-hidden rounded-lg border border-[#1E2A38]/10 bg-[#F5F2EB] p-0 shadow-lg">
          <div className="px-6 pt-6 pb-5">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="font-[family-name:var(--font-display)] text-[20px] font-semibold tracking-tight text-[#1E2A38]">
                Log out?
              </DialogTitle>
              <DialogDescription className="text-[13px] leading-relaxed text-[#1E2A38]/60">
                You&apos;ll need to sign in again to access your account.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[#1E2A38]/10 bg-[#EFECE6]/60 px-6 py-3.5">
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(false)}
              disabled={loading}
              className="h-9 rounded-md px-4 text-[13px] font-medium text-[#1E2A38]/60 transition hover:text-[#1E2A38] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loading}
              className="h-9 rounded-md bg-[#1E2A38] px-4 text-[13px] font-medium text-[#F5F2EB] transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Logging out…" : "Log Out"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
