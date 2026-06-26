import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authApi, LoginResponse, MemberSummary } from '../api/auth';
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
  login: (data: LoginResponse) => Promise<void>;
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
      const accessToken = await SecureStore.getItemAsync(SECURE_KEYS.accessToken);
      const refreshToken = await SecureStore.getItemAsync(SECURE_KEYS.refreshToken);
      if (accessToken && refreshToken) {
        set({ accessToken, refreshToken, isAuthenticated: true });
      }
    } catch {
      // ignore — user must log in
    } finally {
      set({ isInitialized: true });
    }
  },

  login: async (data: LoginResponse) => {
    await SecureStore.setItemAsync(SECURE_KEYS.accessToken, data.accessToken);
    await SecureStore.setItemAsync(SECURE_KEYS.refreshToken, data.refreshToken);
    set({
      user: data.member,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      isAuthenticated: true,
    });
  },

  logout: async () => {
    const { refreshToken } = get();
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {
      // proceed with local logout even if server call fails
    }
    await get().clearAuth();
  },

  updateUser: (partial: Partial<MemberSummary>) => {
    const { user } = get();
    if (user) set({ user: { ...user, ...partial } });
  },

  clearAuth: async () => {
    await SecureStore.deleteItemAsync(SECURE_KEYS.accessToken);
    await SecureStore.deleteItemAsync(SECURE_KEYS.refreshToken);
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },
}));

// Convenience selectors
export const useUser = () => useAuthStore((s) => s.user);
export const useRole = () => useAuthStore((s) => s.user?.role);
export const useChurchId = () => useAuthStore((s) => s.user?.churchId);
export const useIsAuthenticated = () => useAuthStore((s) => s.isAuthenticated);
