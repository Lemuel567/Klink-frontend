import { create } from 'zustand';

interface Notification {
  id: string;
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
  type?: 'info' | 'success' | 'warning' | 'error';
}

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  fcmToken: string | null;
  addNotification: (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  setFcmToken: (token: string) => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  fcmToken: null,

  addNotification: (n) => {
    const notification: Notification = {
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
}));
