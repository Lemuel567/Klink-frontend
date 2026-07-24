import React, { useEffect, useRef } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  PlayfairDisplay_700Bold,
  PlayfairDisplay_700Bold_Italic,
} from '@expo-google-fonts/playfair-display';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '../src/store/authStore';
import { useSoundStore } from '../src/store/soundStore';
import { useBookmarkStore } from '../src/store/bookmarkStore';
import { useNotificationStore } from '../src/store/notificationStore';
import { soundManager } from '../src/utils/soundManager';
import { useTheme } from '../src/hooks/useTheme';
import { useNetworkStatus } from '../src/hooks/useNetworkStatus';
import { MusicIndicator } from '../src/components/common/MusicIndicator';
import { OfflineBanner } from '../src/components/common/OfflineBanner';
import { ErrorBoundary } from '../src/components/common/ErrorBoundary';
import { RotatingBackground } from '../src/components/common/RotatingBackground';
import { registerForPushNotifications, startPushListeners } from '../src/utils/pushNotifications';
import { asyncStoragePersister } from '../src/utils/queryPersister';
import { ACCESS_TOKEN_TTL_MS, TOKEN_REFRESH_MARGIN_MS } from '../src/utils/constants';
import * as SecureStore from 'expo-secure-store';
import { SECURE_KEYS } from '../src/utils/constants';

SplashScreen.preventAutoHideAsync();

// Global unhandled JS error handler — prevents silent crashes.
// `ErrorUtils` is a React Native runtime global not present in the TS lib,
// so it's accessed via the typed `globalThis` cast in types/global.d.ts.
const errorUtils = globalThis.ErrorUtils;
if (errorUtils) {
  const originalHandler = errorUtils.getGlobalHandler?.();
  errorUtils.setGlobalHandler?.((error: Error, isFatal?: boolean) => {
    console.error('[Klink] Global JS error:', error?.message ?? error);
    if (originalHandler) originalHandler(error, isFatal);
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60 * 24,
      networkMode: 'offlineFirst',
      retry: (failureCount, error: any) => {
        if (error?.response?.status === 401 || error?.response?.status === 403) return false;
        if (error?.response?.status && error.response.status < 500) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    },
    mutations: {
      retry: false,
    },
  },
});

export default function RootLayout() {
  const { initialize, isAuthenticated, logout } = useAuthStore();
  const { initialize: initSound } = useSoundStore();
  const userId = useAuthStore((s) => s.user?.id);

  useNetworkStatus();

  // Track whether the session warning has been shown for the current token
  const sessionWarningShownRef = useRef(false);
  const prevUserIdRef = useRef<string | null>(null);

  // Cached server data belongs to ONE member. When the signed-in account
  // changes (sign out, or a different member logs in on this phone), wipe the
  // query cache — otherwise the previous member's polls voted-flags, giving
  // history, notifications, etc. are shown to the next member until each
  // query happens to refetch (slow over tunnels, and a privacy leak).
  // The two zustand-persisted stores (sermon bookmarks, local notification
  // inbox) are device-global, so they must be wiped here too — without this,
  // member B inherits member A's saved sermons and notification history.
  useEffect(() => {
    const prev = prevUserIdRef.current;
    prevUserIdRef.current = userId ?? null;
    if (prev && prev !== userId) {
      queryClient.clear();
      useBookmarkStore.setState({ sermonIds: [] });
      useNotificationStore.getState().clearAll();
    }
  }, [userId]);

  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_700Bold,
    PlayfairDisplay_700Bold_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Initialize all stores, then start global background music
  useEffect(() => {
    async function prepare() {
      await Promise.all([initialize(), initSound(), soundManager.initialize()]);
      if (fontsLoaded || fontError) {
        await SplashScreen.hideAsync();
      }
      if (soundManager.isMusicEnabled()) {
        soundManager.playBackgroundMusic().catch(() => {});
      }
      sessionWarningShownRef.current = false;
    }
    prepare();
  }, [fontsLoaded, fontError]);

  // Global AppState listener — pauses/resumes across every screen
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        soundManager.pauseBackgroundMusic().catch(() => {});
      } else if (nextAppState === 'active') {
        if (soundManager.isMusicEnabled()) {
          soundManager.resumeBackgroundMusic().catch(() => {});
        }
      }
    });
    return () => subscription.remove();
  }, []);

  // Push notifications: register the device token + start the foreground
  // listener whenever a session exists (fresh login OR restored from SecureStore).
  // No-ops safely in Expo Go — remote push needs a dev build.
  useEffect(() => {
    if (!isAuthenticated) return;
    registerForPushNotifications();
    startPushListeners();
  }, [isAuthenticated]);

  // Session timeout warning: alert 2 minutes before token expires
  useEffect(() => {
    if (!isAuthenticated) {
      sessionWarningShownRef.current = false;
      return;
    }

    let warnTimer: ReturnType<typeof setTimeout> | null = null;

    async function scheduleWarning() {
      try {
        const expiryStr = await SecureStore.getItemAsync(SECURE_KEYS.tokenExpiry).catch(() => null);
        if (!expiryStr) return;

        const expiry = parseInt(expiryStr, 10);
        if (isNaN(expiry)) return;

        const warnAt = expiry - 2 * 60 * 1000; // 2 minutes before expiry
        const msUntilWarn = warnAt - Date.now();

        if (msUntilWarn <= 0 || sessionWarningShownRef.current) return;

        warnTimer = setTimeout(() => {
          if (!sessionWarningShownRef.current) {
            sessionWarningShownRef.current = true;
            Alert.alert(
              'Session Expiring',
              'Your session will expire in 2 minutes. Would you like to stay signed in?',
              [
                { text: 'Sign out', style: 'destructive', onPress: () => logout() },
                {
                  text: 'Stay signed in',
                  onPress: async () => {
                    // Trigger a background refresh by forcing a query
                    queryClient.invalidateQueries();
                  },
                },
              ],
            );
          }
        }, msUntilWarn);
      } catch {
        // non-fatal
      }
    }

    scheduleWarning();
    return () => { if (warnTimer) clearTimeout(warnTimer); };
  }, [isAuthenticated]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <PersistQueryClientProvider
            client={queryClient}
            // buster: bump to drop ALL persisted cache. v2 (2026-07-12) fixes the
            // "length of undefined" crash inside TanStack's infiniteQueryBehavior —
            // stale pre-upgrade infinite-query entries lacked pageParams.
            // v4 (2026-07-23): drops caches poisoned by the payments-page
            // ['store-my-purchases'] key collision (plain vs infinite shape).
            persistOptions={{ persister: asyncStoragePersister, buster: 'klink-cache-v4' }}
          >
            <StatusBar style="light" />
            {/* THE LOGIN-PAGE LOOK, EVERYWHERE (2026-07-12): one rotating
                worship-photo background behind the whole app; every screen
                renders on a transparent container with glass surfaces. */}
            <RotatingBackground
              style={{ flex: 1 }}
              overlayColors={['rgba(10,5,32,0.45)', 'rgba(10,5,32,0.6)', 'rgba(10,5,32,0.75)'] as const}
            >
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: 'transparent' },
                // Motion overhaul (2026-07-22): every push slides in smoothly on
                // BOTH platforms (Android's default was an abrupt jump). Modal
                // screens keep their native slide-up via presentation: 'modal'.
                animation: 'slide_from_right',
                animationDuration: 280,
              }}
            >
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="profile/edit" options={{ presentation: 'modal', headerShown: false }} />
              <Stack.Screen name="profile/journey" />
              <Stack.Screen name="for-you/index" />
              <Stack.Screen name="bible/index" />
              <Stack.Screen name="live/index" />
              <Stack.Screen name="church/settings" options={{ presentation: 'modal', headerShown: false }} />
              <Stack.Screen name="members/[id]" options={{ presentation: 'modal' }} />
              <Stack.Screen name="giving/new" options={{ presentation: 'modal' }} />
              <Stack.Screen name="giving/pay" options={{ presentation: 'modal' }} />
              <Stack.Screen name="giving/payment-history" />
              <Stack.Screen name="giving/history" />
              <Stack.Screen name="payments/index" />
              <Stack.Screen name="finances/collections" />
              <Stack.Screen name="analytics/index" />
              <Stack.Screen name="giving/recurring" />
              <Stack.Screen name="assistant/index" />
              <Stack.Screen name="projects/index" />
              <Stack.Screen name="projects/[id]" />
              <Stack.Screen name="facilities/index" />
              <Stack.Screen name="facilities/[id]" />
              <Stack.Screen name="events/index" />
              <Stack.Screen name="announcements/index" />
              <Stack.Screen name="sermons/[id]" />
              <Stack.Screen name="prayer/index" />
              <Stack.Screen name="prayer/new" options={{ presentation: 'modal' }} />
              <Stack.Screen name="devotional/index" />
              <Stack.Screen name="attendance/index" />
              <Stack.Screen name="attendance/scan" options={{ presentation: 'fullScreenModal' }} />
              <Stack.Screen name="attendance/session" options={{ presentation: 'modal' }} />
              <Stack.Screen name="events/[id]" />
              <Stack.Screen name="groups/index" />
              <Stack.Screen name="groups/[id]" />
              <Stack.Screen name="notifications/index" />
              <Stack.Screen name="store/index" />
              <Stack.Screen name="pledges/index" />
              <Stack.Screen name="polls/index" />
              <Stack.Screen name="gallery/index" />
              <Stack.Screen name="files/index" />
              <Stack.Screen name="hall-of-fame/index" />
              <Stack.Screen name="members/register" options={{ presentation: 'modal' }} />
              <Stack.Screen name="profile/change-password" options={{ presentation: 'modal' }} />
            </Stack>
            </RotatingBackground>
          </PersistQueryClientProvider>
          {/* Floats over every screen — only visible when music is playing */}
          <MusicIndicator />
          {/* Shows when network is unreachable */}
          <OfflineBanner />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
