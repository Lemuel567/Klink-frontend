import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
  type?: 'info' | 'success' | 'warning' | 'error';
}

interface NotificationStore {
  notifications: AppNotification[];
  unreadCount: number;
  fcmToken: string | null;
  addNotification: (n: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  setFcmToken: (token: string) => void;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      fcmToken: null,

      addNotification: (n) => {
        const notification: AppNotification = {
          ...n,
          id: `notif_${Date.now()}_${Math.random()}`,
          timestamp: Date.now(),
          read: false,
        };
        set((state) => ({
          notifications: [notification, ...state.notifications].slice(0, 50),
          unreadCount: state.unreadCount + 1,
        }));
      },

      markRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
          unreadCount: Math.max(0, state.unreadCount - 1),
        })),

      markAllRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        })),

      clearAll: () => set({ notifications: [], unreadCount: 0 }),

      setFcmToken: (token) => set({ fcmToken: token }),
    }),
    {
      name: 'klink_notifications',
      storage: createJSONStorage(() => AsyncStorage),
      // fcmToken is re-registered on login; no need to persist it here
      partialize: (state) => ({
        notifications: state.notifications,
        unreadCount: state.unreadCount,
      }),
    },
  ),
);

export const useUnreadCount = () => useNotificationStore((s) => s.unreadCount);
