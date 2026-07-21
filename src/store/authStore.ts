import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authApi, AuthResponse, MemberSummary } from '../api/auth';
import { SECURE_KEYS, ACCESS_TOKEN_TTL_MS } from '../utils/constants';

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
      // Previously missing — the profile lost the member's email and photo on
      // every fresh login until they re-uploaded a picture.
      email: data.email ?? undefined,
      photoUrl: data.photoUrl ?? undefined,
      emailVerified: data.emailVerified,
      phoneVerified: data.phoneVerified,
    };
    const tokenExpiry = String(Date.now() + ACCESS_TOKEN_TTL_MS);
    await Promise.all([
      SecureStore.setItemAsync(SECURE_KEYS.accessToken, data.token),
      SecureStore.setItemAsync(SECURE_KEYS.refreshToken, data.refreshToken),
      SecureStore.setItemAsync(SECURE_KEYS.user, JSON.stringify(user)),
      SecureStore.setItemAsync(SECURE_KEYS.tokenExpiry, tokenExpiry),
    ]);
    set({
      user,
      accessToken: data.token,
      refreshToken: data.refreshToken,
      isAuthenticated: true,
    });
    // Restart worship music for the new session (logout stops it)
    try {
      const { soundManager } = require('../utils/soundManager');
      if (soundManager.isMusicEnabled()) {
        soundManager.playBackgroundMusic().catch(() => {});
      }
    } catch {
      // non-fatal
    }
  },

  logout: async () => {
    // Best-effort: clear the device push token server-side BEFORE the session
    // is revoked, so a signed-out device stops receiving pushes. Fire-and-forget.
    try {
      const { unregisterPushNotifications } = require('../utils/pushNotifications');
      unregisterPushNotifications();
    } catch {
      // non-fatal
    }
    // Fire-and-forget server revoke — NEVER block sign-out on the network.
    // (Awaiting this made "Sign out" feel dead for seconds on slow tunnels.)
    authApi.logout().catch(() => {});
    // Stop background music so it doesn't keep playing after logout
    try {
      const { soundManager } = require('../utils/soundManager');
      await soundManager.stopBackgroundMusic();
    } catch {
      // non-fatal
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
      SecureStore.deleteItemAsync(SECURE_KEYS.accessToken).catch(() => {}),
      SecureStore.deleteItemAsync(SECURE_KEYS.refreshToken).catch(() => {}),
      SecureStore.deleteItemAsync(SECURE_KEYS.user).catch(() => {}),
      SecureStore.deleteItemAsync(SECURE_KEYS.tokenExpiry).catch(() => {}),
    ]);
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },
}));

export const useUser = () => useAuthStore((s) => s.user);
export const useRole = () => useAuthStore((s) => s.user?.role);
export const useChurchId = () => useAuthStore((s) => s.user?.churchId);
export const useIsAuthenticated = () => useAuthStore((s) => s.isAuthenticated);
