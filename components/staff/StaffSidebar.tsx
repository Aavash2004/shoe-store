"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { performLogout } from "@/lib/auth/logout";
import {
  Receipt,
  Boxes,
  LogOut,
  Menu,
  X,
  Package,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StaffSidebarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    isAdmin?: boolean;
  };
}

const STAFF_NAV_ITEMS = [
  { href: "/staff/orders", label: "Orders", icon: Receipt },
  { href: "/staff/inventory", label: "Inventory", icon: Boxes },
];

export function StaffSidebar({ user }: StaffSidebarProps) {
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
    await performLogout("/staff/login");
  }

  const isLinkActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const displayName = user?.name || "Staff";

  const renderNavLinks = () => (
    <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
      <div className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-navy)]/40">
        Navigation
      </div>
      {STAFF_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isLinkActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href as any}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
              active
                ? "bg-[var(--color-navy)] text-white shadow-sm"
                : "text-[var(--color-navy)]/65 hover:bg-[var(--color-sand)]/60 hover:text-[var(--color-navy)]"
            }`}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  const renderUserSection = () => (
    <div className="border-t border-[var(--color-sand)] px-4 py-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-9 w-9 rounded-full bg-[var(--color-sky)]/20 flex items-center justify-center">
          <span className="text-sm font-bold text-[var(--color-navy)]">
            {displayName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--color-navy)] truncate">
            {displayName}
          </p>
          <p className="text-[11px] text-[var(--color-navy)]/45 truncate">
            {user?.isAdmin ? "Admin (viewing staff)" : "Staff"}
          </p>
        </div>
      </div>
      <button
        onClick={() => setShowLogoutConfirm(true)}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rose-600/80 transition-colors hover:bg-rose-50 hover:text-rose-700"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between border-b border-[var(--color-sand)] bg-[var(--color-cream)]/95 px-4 py-3 backdrop-blur-sm lg:hidden">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-[var(--color-navy)]" />
          <span className="text-sm font-bold text-[var(--color-navy)] tracking-tight">
            Staff Portal
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-1.5 text-[var(--color-navy)]/60 hover:bg-[var(--color-sand)]/50"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-[var(--color-cream)] border-r border-[var(--color-sand)] transition-transform duration-200 ease-out lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 border-b border-[var(--color-sand)] px-5 py-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-navy)]">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--color-navy)] tracking-tight">
                ABXV Staff
              </h2>
              <p className="text-[10px] text-[var(--color-navy)]/40">
                Fulfillment & Inventory
              </p>
            </div>
          </div>
          {renderNavLinks()}
          {renderUserSection()}
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-[var(--color-sand)] bg-[var(--color-cream)] lg:flex lg:flex-col">
        <div className="flex items-center gap-3 border-b border-[var(--color-sand)] px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-navy)]">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--color-navy)] tracking-tight">
              ABXV Staff
            </h2>
            <p className="text-[10px] text-[var(--color-navy)]/40">
              Fulfillment & Inventory
            </p>
          </div>
        </div>
        {renderNavLinks()}
        {renderUserSection()}
      </aside>

      {/* Spacer for mobile top bar */}
      <div className="h-14 lg:hidden" />

      {/* Logout confirmation dialog */}
      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[var(--color-navy)]">
              Sign out?
            </DialogTitle>
            <DialogDescription className="text-[var(--color-navy)]/55">
              You'll need your access code to sign back in.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowLogoutConfirm(false)}
              disabled={loggingOut}
              className="flex-1 rounded-lg border border-[var(--color-sand)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-navy)] hover:bg-[var(--color-cream-alt)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex-1 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 transition-colors disabled:opacity-50"
            >
              {loggingOut ? "Signing out..." : "Sign Out"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
