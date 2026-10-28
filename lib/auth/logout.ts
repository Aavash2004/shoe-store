"use client";

import { signOut } from "next-auth/react";
import { useWishlistStore } from "@/stores/wishlist-store";
import { useNotificationStore } from "@/stores/notification-store";

/**
 * Robust, cross-environment logout handler for both Vercel production and local environments.
 * 1. Resets all client-side state stores (wishlist, notifications).
 * 2. Clears client-accessible document cookies.
 * 3. Calls /api/auth/logout to delete all server-side HttpOnly session cookies (__Secure-authjs.session-token, etc.).
 * 4. Triggers NextAuth client-side signOut broadcaster.
 * 5. Performs a full window navigation to wipe all memory state and cached Next.js App Router context.
 */
export async function performLogout(redirectTo: string = "/"): Promise<void> {
  // 1. Reset client Zustand stores
  try {
    useWishlistStore.getState().clearWishlist();
  } catch {}
  try {
    useNotificationStore.getState().resetNotifications();
  } catch {}

  // 2. Clear client document cookies
  if (typeof document !== "undefined") {
    try {
      const cookies = document.cookie.split(";");
      for (const cookie of cookies) {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
        if (
          name.includes("auth") ||
          name.includes("session") ||
          name.includes("csrf") ||
          name.includes("token")
        ) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;secure`;
        }
      }
    } catch {}
  }

  // 3. Force server-side cookie deletion via dedicated API route
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
  } catch {}

  // 4. Trigger NextAuth client-side signOut (without auto-redirect so we handle full page reload cleanly)
  try {
    await signOut({ redirect: false });
  } catch {}

  // 5. Hard browser reload to guarantee complete reset of React and Next.js client context
  if (typeof window !== "undefined") {
    window.location.href = redirectTo;
  }
}
