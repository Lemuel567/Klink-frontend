import { useCallback } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';

export function useAuth() {
  const { user, isAuthenticated, isLoading, accessToken, login, logout, clearAuth } = useAuthStore();

  const handleLogout = useCallback(async () => {
    try {
      if (accessToken) {
        await authApi.logout().catch(() => {});
      }
    } finally {
      clearAuth();
      router.replace('/(auth)/login');
    }
  }, [accessToken, clearAuth]);

  const redirectIfUnauthenticated = useCallback(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isLoading]);

  return {
    user,
    isAuthenticated,
    isLoading,
    role: user?.role ?? null,
    churchId: user?.churchId ?? null,
    memberId: user?.id ?? null,
    logout: handleLogout,
    redirectIfUnauthenticated,
  };
}
