"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  ShoppingBag,
  FolderTree,
  Boxes,
  Receipt,
  Ticket,
  Star,
  Users,
  LogOut,
  Menu,
  X,
  Store,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AdminSidebarProps {
  user?: {
    name?: string | null;
    email?: string | null;
  };
}

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: ShoppingBag },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes },
  { href: "/admin/orders", label: "Orders", icon: Receipt },
  { href: "/admin/coupons", label: "Coupons", icon: Ticket },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/users", label: "Users", icon: Users },
];

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Close mobile drawer on route change
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  async function handleLogout() {
    setLoggingOut(true);
    await signOut({ callbackUrl: "/admin/login" });
  }

  const isLinkActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const displayName = user?.name || "Administrator";

  const renderNavLinks = () => (
    <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
      <div className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-navy)]/40">
        Navigation
      </div>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isLinkActive(item.href);

        return (
          <Link
            key={item.href}
            href={item.href as Route}
            className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-150 ${
              active
                ? "bg-[var(--color-navy)] text-white shadow-xs font-bold"
                : "text-[var(--color-navy)]/70 hover:bg-[var(--color-sand)]/40 hover:text-[var(--color-navy)]"
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon
                className={`h-4 w-4 shrink-0 transition-colors ${
                  active
                    ? "text-white"
                    : "text-[var(--color-navy)]/55 group-hover:text-[var(--color-navy)]"
                }`}
              />
              <span>{item.label}</span>
            </div>
            {active && <ChevronRight className="h-3.5 w-3.5 text-white/70" />}
          </Link>
        );
      })}

      <div className="pt-4 px-3 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-navy)]/40">
        Quick Links
      </div>
      <Link
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-[var(--color-navy)]/65 hover:bg-[var(--color-sand)]/40 hover:text-[var(--color-navy)] transition-colors"
      >
        <Store className="h-4 w-4 text-[var(--color-navy)]/55" />
        <span>View Live Storefront</span>
      </Link>
    </nav>
  );

  return (
    <>
      {/* ========================================================
          1. Mobile Top Bar (< lg)
      ======================================================== */}
      <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-[var(--color-sand)] bg-[var(--color-cream)]/95 px-4 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-sand)] text-[var(--color-navy)] hover:bg-[var(--color-sand)]/40 active:scale-95 transition-all"
            aria-label="Open admin navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/admin" className="flex items-center gap-2">
            <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-lg bg-[var(--color-cream-alt)] p-0.5 border border-[var(--color-sand)]">
              <Image
                src="/images/Shoes/logo.png"
                alt="ABXV"
                fill
                className="object-contain p-0.5"
              />
            </div>
            <span className="font-[family-name:var(--font-display)] text-base font-extrabold tracking-wider text-[var(--color-navy)]">
              ABXV
            </span>
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setShowLogoutConfirm(true)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-sand)] text-[var(--color-navy)]/70 hover:bg-rose-50 hover:text-rose-600 transition-colors"
          title="Sign Out"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </header>

      {/* ========================================================
          2. Mobile Slide-out Drawer (< lg)
      ======================================================== */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer content */}
          <div className="fixed inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-[var(--color-sand)] bg-[var(--color-cream)] shadow-2xl animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="flex h-14 items-center justify-between border-b border-[var(--color-sand)] px-4">
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 font-[family-name:var(--font-display)] text-base font-extrabold tracking-wider text-[var(--color-navy)]"
              >
                <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-lg bg-[var(--color-cream-alt)] p-0.5 border border-[var(--color-sand)]">
                  <Image
                    src="/images/Shoes/logo.png"
                    alt="ABXV"
                    fill
                    className="object-contain p-0.5"
                  />
                </div>
                <span>ABXV</span>
              </Link>

              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 text-[var(--color-navy)]/60 hover:bg-[var(--color-sand)]/40 hover:text-[var(--color-navy)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Navigation list */}
            {renderNavLinks()}

            {/* Drawer Footer */}
            <div className="border-t border-[var(--color-sand)] p-3">
              <div className="flex items-center justify-between rounded-xl bg-[var(--color-cream-alt)] p-2.5 border border-[var(--color-sand)]">
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-bold text-[var(--color-navy)] truncate">
                    {displayName}
                  </p>
                  <p className="text-[10px] text-[var(--color-navy)]/50">
                    Administrator
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  className="rounded-lg p-1.5 text-[var(--color-navy)]/60 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          3. Desktop Fixed Sidebar (>= lg)
      ======================================================== */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-[var(--color-sand)] bg-[var(--color-cream)] shadow-xs lg:flex">
        {/* Brand Header */}
        <div className="flex h-16 items-center border-b border-[var(--color-sand)] px-6">
          <Link
            href="/admin"
            className="flex items-center gap-2.5 font-[family-name:var(--font-display)] text-lg font-extrabold tracking-wider text-[var(--color-navy)] transition-opacity hover:opacity-90"
          >
            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-xl bg-[var(--color-cream-alt)] p-1 border border-[var(--color-sand)] shadow-2xs">
              <Image
                src="/images/Shoes/logo.png"
                alt="ABXV"
                fill
                className="object-contain p-0.5"
              />
            </div>
            <span className="font-[family-name:var(--font-display)] text-lg font-extrabold tracking-wider text-[var(--color-navy)]">
              ABXV
            </span>
          </Link>
        </div>

        {/* Navigation Links */}
        {renderNavLinks()}

        {/* Footer Account & Sign Out */}
        <div className="border-t border-[var(--color-sand)] p-3.5">
          <div className="flex items-center justify-between rounded-xl bg-[var(--color-cream-alt)] p-2.5 border border-[var(--color-sand)] shadow-2xs">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-bold text-[var(--color-navy)] truncate">
                {displayName}
              </p>
              <p className="text-[10px] font-medium text-[var(--color-navy)]/50">
                Administrator
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-sand)] bg-white text-[var(--color-navy)]/70 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition-colors shadow-2xs"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================
          4. Logout Confirmation Dialog
      ======================================================== */}
      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className="sm:max-w-md bg-[var(--color-cream)] border-[var(--color-sand)] p-6">
          <DialogHeader>
            <DialogTitle className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-navy)]">
              Sign out of Admin Console?
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--color-navy)]/70 mt-1">
              You will be returned to the admin login page. Unsaved modifications will be discarded.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2.5 mt-5">
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(false)}
              className="rounded-xl border border-[var(--color-sand)] px-4 py-2 text-xs font-semibold text-[var(--color-navy)]/80 hover:bg-[var(--color-sand)]/30 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
            >
              {loggingOut ? "Signing out..." : "Sign Out"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
