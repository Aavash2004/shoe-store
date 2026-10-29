import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { NotificationItem } from "@/app/api/notifications/route";

export function isItemRead(item: NotificationItem, readIds: string[]): boolean {
  if (readIds.includes(item.id)) return true;
  // Backward compatibility with previous ID naming schemes
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
}

export function computeUnreadCount(
  items: NotificationItem[],
  readIds: string[]
): number {
  return items.filter((item) => !isItemRead(item, readIds)).length;
}

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  isOpen: boolean;
  isLoading: boolean;
  readIds: string[];
  guestOrderIds: string[];

  setIsOpen: (isOpen: boolean) => void;
  toggleOpen: () => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearReadNotifications: () => void;
  addGuestOrderId: (orderId: string) => void;
  fetchNotifications: () => Promise<void>;
  resetNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      isOpen: false,
      isLoading: false,
      readIds: [],
      guestOrderIds: [],

      resetNotifications: () => {
        set({
          notifications: [],
          unreadCount: 0,
          isOpen: false,
          isLoading: false,
          readIds: [],
          guestOrderIds: [],
        });
      },

      setIsOpen: (isOpen: boolean) => set({ isOpen }),

      toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

      markAsRead: (id: string) => {
        const { readIds, notifications } = get();
        if (readIds.includes(id)) return;
        const newReadIds = [...readIds, id];
        const unreadCount = computeUnreadCount(notifications, newReadIds);
        set({ readIds: newReadIds, unreadCount });
      },

      markAllAsRead: () => {
        const { notifications, readIds } = get();
        const allIds = notifications.map((n) => n.id);
        const mergedReadIds = Array.from(new Set([...readIds, ...allIds]));
        set({ readIds: mergedReadIds, unreadCount: 0 });
      },

      clearReadNotifications: () => {
        const { notifications, readIds } = get();
        const unreadOnly = notifications.filter((n) => !isItemRead(n, readIds));
        set({
          notifications: unreadOnly,
          unreadCount: unreadOnly.length,
        });
      },

      addGuestOrderId: (orderId: string) => {
        const { guestOrderIds } = get();
        if (guestOrderIds.includes(orderId)) return;
        const newIds = [orderId, ...guestOrderIds].slice(0, 10);
        set({ guestOrderIds: newIds });
        get().fetchNotifications();
      },

      fetchNotifications: async () => {
        try {
          set({ isLoading: true });

          // Direct localStorage check to protect against unhydrated state on initial mount
          let currentReadIds = get().readIds;
          if (typeof window !== "undefined" && currentReadIds.length === 0) {
            try {
              const raw = localStorage.getItem("abxv_notifications_store");
              if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed?.state?.readIds)) {
                  currentReadIds = parsed.state.readIds;
                }
              }
            } catch {}
          }

          const { guestOrderIds } = get();
          const queryParams = new URLSearchParams();

          if (guestOrderIds.length > 0) {
            queryParams.set("orderIds", guestOrderIds.join(","));
          }

          const url = `/api/notifications${
            queryParams.toString() ? `?${queryParams.toString()}` : ""
          }`;

          const res = await fetch(url);
          if (!res.ok) {
            throw new Error("Failed to load notifications");
          }

          const data = await res.json();
          const items: NotificationItem[] = data.notifications || [];

          // Merge any read IDs recorded during fetch with currentReadIds
          const freshReadIds = Array.from(
            new Set([...currentReadIds, ...get().readIds])
          );

          // Strictly calculate unread count against read IDs
          const unreadCount = computeUnreadCount(items, freshReadIds);

          set({
            notifications: items,
            readIds: freshReadIds,
            unreadCount,
            isLoading: false,
          });
        } catch (err) {
          console.warn("[Notification Store] Failed to fetch notifications:", err);
          set({ isLoading: false });
        }
      },
    }),
    {
      name: "abxv_notifications_store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        readIds: state.readIds,
        guestOrderIds: state.guestOrderIds,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.unreadCount = computeUnreadCount(
            state.notifications || [],
            state.readIds || []
          );
        }
      },
    }
  )
);
