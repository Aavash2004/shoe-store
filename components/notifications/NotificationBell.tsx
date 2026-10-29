"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Bell,
  Check,
  CheckCheck,
  Package,
  Truck,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Clock,
  Inbox,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotificationStore } from "@/stores/notification-store";
import type { NotificationItem } from "@/app/api/notifications/route";

function formatRelativeTime(dateString: string): string {
  try {
    const now = new Date().getTime();
    const past = new Date(dateString).getTime();
    const diffSeconds = Math.max(0, Math.floor((now - past) / 1000));

    if (diffSeconds < 60) return "Just now";
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(dateString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Recently";
  }
}

export function NotificationBell() {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Default to "unread" so previously read notifications are never loaded with the new one
  const [filter, setFilter] = useState<"unread" | "all">("unread");
  const { status } = useSession();
  const isLoggedIn = status === "authenticated";

  const {
    notifications,
    unreadCount,
    isOpen,
    setIsOpen,
    toggleOpen,
    markAsRead,
    markAllAsRead,
    clearReadNotifications,
    fetchNotifications,
    readIds,
    guestOrderIds,
  } = useNotificationStore();

  // Initial fetch and 30-second live polling (for logged in users and guests with orders)
  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);

    const handleOrderEvent = () => {
      fetchNotifications();
    };

    window.addEventListener("order-placed", handleOrderEvent);
    window.addEventListener("order-updated", handleOrderEvent);
    window.addEventListener("focus", handleOrderEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener("order-placed", handleOrderEvent);
      window.removeEventListener("order-updated", handleOrderEvent);
      window.removeEventListener("focus", handleOrderEvent);
    };
  }, [fetchNotifications]);

  // When opening the notification center, if there are unread items, always focus on unread view
  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      setFilter("unread");
    }
  }, [isOpen, unreadCount]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, setIsOpen]);

  // Escape key to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setIsOpen]);

  // Helper to determine if an item is read with backward-compatible ID support
  const isItemRead = (item: NotificationItem): boolean => {
    if (readIds.includes(item.id)) return true;
    if (item.id.startsWith("notif-order-")) {
      const rawId = item.id.replace("notif-order-", "");
      if (
        readIds.includes(`notif-placed-${rawId}`) ||
        readIds.includes(`notif-paid-${rawId}`)
      ) {
        return true;
      }
    }
    return false;
  };

  const unreadNotifications = notifications.filter((n) => !isItemRead(n));
  const displayedNotifications =
    filter === "unread" ? unreadNotifications : notifications;

  const getNotificationIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "PAYMENT_SUCCESS":
        return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      case "SHIPPED":
        return <Truck className="h-4 w-4 text-sky-600" />;
      case "DELIVERED":
        return <Package className="h-4 w-4 text-emerald-600" />;
      case "ANNOUNCEMENT":
        return <Sparkles className="h-4 w-4 text-purple-600" />;
      case "ORDER_PLACED":
      default:
        return <Package className="h-4 w-4 text-[var(--color-navy)]" />;
    }
  };

  const handleItemClick = (item: NotificationItem) => {
    markAsRead(item.id);
    setIsOpen(false);
    if (item.link) {
      router.push(item.link as any);
    }
  };

  return (
    <div ref={dropdownRef} className="relative inline-block">
      {/* Bell Trigger Button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={toggleOpen}
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-expanded={isOpen}
        className="relative rounded-full text-[var(--color-navy)] hover:bg-[var(--color-sand)]/40 hover:text-[var(--color-navy)] focus-visible:ring-2 focus-visible:ring-[var(--color-navy)] focus-visible:ring-offset-1 transition-transform active:scale-95 cursor-pointer"
      >
        <Bell className="h-5 w-5" strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-[#FC563C] px-1 text-[10px] font-bold leading-none text-white border-2 border-[var(--color-cream)] shadow-xs animate-in zoom-in-50">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {/* Floating Notification Center Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl border border-[var(--color-sand)] bg-white/95 backdrop-blur-md shadow-2xl shadow-[var(--color-navy)]/10 z-50 overflow-hidden animate-in fade-in-50 slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--color-sand)]/60 px-4 py-3 bg-[var(--color-cream)]/50">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[var(--color-navy)]">
                Notifications
              </h3>
              {unreadCount > 0 ? (
                <span className="rounded-full bg-[#FC563C]/10 px-2 py-0.5 text-[11px] font-bold text-[#FC563C]">
                  {unreadCount} new
                </span>
              ) : (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  Caught up
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-[var(--color-navy)]/70 hover:bg-[var(--color-sand)]/40 hover:text-[var(--color-navy)] transition-colors cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-[var(--color-navy)]/50 hover:bg-[var(--color-sand)]/40 hover:text-[var(--color-navy)] transition-colors cursor-pointer"
                aria-label="Close notifications"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Filter Pills and Clean Options */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-sand)]/40 bg-white">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilter("unread")}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  filter === "unread"
                    ? "bg-[var(--color-navy)] text-white shadow-xs"
                    : "text-[var(--color-navy)]/60 hover:text-[var(--color-navy)] hover:bg-[var(--color-sand)]/30"
                }`}
              >
                Unread ({unreadCount})
              </button>
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  filter === "all"
                    ? "bg-[var(--color-navy)] text-white shadow-xs"
                    : "text-[var(--color-navy)]/60 hover:text-[var(--color-navy)] hover:bg-[var(--color-sand)]/30"
                }`}
              >
                All ({notifications.length})
              </button>
            </div>

            {notifications.length > unreadCount && (
              <button
                type="button"
                onClick={() => clearReadNotifications()}
                className="text-[10px] font-medium text-[var(--color-navy)]/50 hover:text-[#FC563C] transition-colors cursor-pointer"
                title="Clear read notifications from history"
              >
                Clear read
              </button>
            )}
          </div>

          {/* Notifications Scrollable List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-[var(--color-sand)]/30">
            {displayedNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-3 border border-emerald-100/60">
                  {filter === "unread" ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <Inbox className="h-6 w-6" />
                  )}
                </div>
                <p className="text-xs font-bold text-[var(--color-navy)]">
                  {filter === "unread"
                    ? "You're all caught up!"
                    : "No notification history"}
                </p>
                <p className="mt-1 text-[11px] text-[var(--color-navy)]/60 max-w-[220px]">
                  {filter === "unread"
                    ? "No unread notifications. New order updates and shipping notices will appear here."
                    : "Updates on your shoe orders, tracking numbers, and delivery milestones will appear here."}
                </p>
                {filter === "unread" && notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilter("all")}
                    className="mt-3 inline-flex items-center gap-1 rounded-full bg-[var(--color-navy)]/5 px-3 py-1 text-xs font-semibold text-[var(--color-navy)] hover:bg-[var(--color-navy)]/10 transition-colors cursor-pointer"
                  >
                    View past notifications ({notifications.length})
                  </button>
                )}
              </div>
            ) : (
              displayedNotifications.map((item) => {
                const isRead = isItemRead(item);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`group relative flex items-start gap-3 p-3.5 text-left transition-colors cursor-pointer hover:bg-[var(--color-cream)]/50 ${
                      !isRead ? "bg-sky-50/40" : "bg-white"
                    }`}
                  >
                    {/* Notification Type Icon */}
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white border border-[var(--color-sand)] shadow-xs">
                      {getNotificationIcon(item.type)}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span
                          className={`text-xs font-bold truncate ${
                            !isRead
                              ? "text-[var(--color-navy)]"
                              : "text-[var(--color-navy)]/80"
                          }`}
                        >
                          {item.title}
                        </span>
                        <span className="shrink-0 text-[10px] font-medium text-[var(--color-navy)]/50">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>

                      <p className="text-[11px] text-[var(--color-navy)]/70 line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>

                      <div className="mt-2 flex items-center justify-between">
                        {item.statusBadge ? (
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
                              item.statusColor === "emerald"
                                ? "bg-emerald-100 text-emerald-800"
                                : item.statusColor === "purple"
                                ? "bg-purple-100 text-purple-800"
                                : item.statusColor === "amber"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {item.statusBadge}
                          </span>
                        ) : (
                          <span />
                        )}

                        <div className="flex items-center gap-2">
                          {!isRead && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(item.id);
                              }}
                              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-navy)]/60 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                              title="Mark as read"
                            >
                              <Check className="h-3 w-3" />
                              <span>Read</span>
                            </button>
                          )}
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--color-navy)]/60 group-hover:text-[var(--color-navy)]">
                            <span>Details</span>
                            <ExternalLink className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Unread indicator dot */}
                    {!isRead && (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#FC563C]" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[var(--color-sand)]/60 bg-[var(--color-cream)]/30 p-2.5 text-center">
            <Link
              href="/account/orders"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-bold text-[var(--color-navy)] hover:underline inline-flex items-center gap-1"
            >
              <span>View all orders & tracking history</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
