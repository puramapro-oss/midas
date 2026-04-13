import { create } from "zustand";
import { api } from "../lib/api";
import type { Notification } from "../lib/types";

interface NotifState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  fetch: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
}

export const useNotifStore = create<NotifState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetch: async () => {
    set({ loading: true });
    try {
      const data = await api.get<{ notifications: Notification[] }>(
        "/notifications"
      );
      const notifs = data.notifications ?? [];
      set({
        notifications: notifs,
        unreadCount: notifs.filter((n) => !n.read).length,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  markRead: async (id) => {
    try {
      await api.post("/notifications", { id, read: true });
      set((s) => ({
        notifications: s.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, s.unreadCount - 1),
      }));
    } catch {
      // silent
    }
  },
}));
