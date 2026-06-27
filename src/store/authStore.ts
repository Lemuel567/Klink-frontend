import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authApi, AuthResponse, MemberSummary } from '../api/auth';
import { SECURE_KEYS } from '../utils/constants';

interface AuthState {
  user: MemberSummary | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
}

interface AuthActions {
  initialize: () => Promise<void>;
  login: (data: AuthResponse) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: Partial<MemberSummary>) => void;
  clearAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    try {
      const [accessToken, refreshToken, userJson] = await Promise.all([
        SecureStore.getItemAsync(SECURE_KEYS.accessToken),
        SecureStore.getItemAsync(SECURE_KEYS.refreshToken),
        SecureStore.getItemAsync(SECURE_KEYS.user),
      ]);
      if (accessToken && refreshToken) {
        const user: MemberSummary | null = userJson ? JSON.parse(userJson) : null;
        set({ accessToken, refreshToken, isAuthenticated: true, user });
      }
    } catch {
      // ignore — user must log in
    } finally {
      set({ isInitialized: true });
    }
  },

  // Backend returns AuthResponse with "token" field (not "accessToken")
  login: async (data: AuthResponse) => {
    const user: MemberSummary = {
      id: data.memberId,
      fullName: data.fullName,
      role: data.role,
      churchId: data.churchId,
      churchCode: data.churchCode,
      emailVerified: data.emailVerified,
      phoneVerified: data.phoneVerified,
    };
    await Promise.all([
      SecureStore.setItemAsync(SECURE_KEYS.accessToken, data.token),
      SecureStore.setItemAsync(SECURE_KEYS.refreshToken, data.refreshToken),
      SecureStore.setItemAsync(SECURE_KEYS.user, JSON.stringify(user)),
    ]);
    set({
      user,
      accessToken: data.token,
      refreshToken: data.refreshToken,
      isAuthenticated: true,
    });
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // proceed with local logout even if server call fails
    }
    await get().clearAuth();
  },

  updateUser: (partial: Partial<MemberSummary>) => {
    const { user } = get();
    if (user) {
      const updated = { ...user, ...partial };
      set({ user: updated });
      SecureStore.setItemAsync(SECURE_KEYS.user, JSON.stringify(updated)).catch(() => {});
    }
  },

  clearAuth: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(SECURE_KEYS.accessToken),
      SecureStore.deleteItemAsync(SECURE_KEYS.refreshToken),
      SecureStore.deleteItemAsync(SECURE_KEYS.user),
    ]);
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },
}));

export const useUser = () => useAuthStore((s) => s.user);
export const useRole = () => useAuthStore((s) => s.user?.role);
export const useChurchId = () => useAuthStore((s) => s.user?.churchId);
export const useIsAuthenticated = () => useAuthStore((s) => s.isAuthenticated);
