import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { NotificationItem } from "@/app/api/notifications/route";

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
  addGuestOrderId: (orderId: string) => void;
  fetchNotifications: () => Promise<void>;
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

      setIsOpen: (isOpen: boolean) => set({ isOpen }),

      toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

      markAsRead: (id: string) => {
        const { readIds, notifications } = get();
        if (readIds.includes(id)) return;
        const newReadIds = [...readIds, id];
        const unreadCount = notifications.filter(
          (n) => !newReadIds.includes(n.id)
        ).length;
        set({ readIds: newReadIds, unreadCount });
      },

      markAllAsRead: () => {
        const { notifications } = get();
        const allIds = notifications.map((n) => n.id);
        set({ readIds: allIds, unreadCount: 0 });
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
          const { guestOrderIds, readIds } = get();
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

          // Compute unread count based on stored readIds
          const unreadCount = items.filter(
            (item) => !readIds.includes(item.id)
          ).length;

          set({
            notifications: items,
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
    }
  )
);
