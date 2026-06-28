import React, { useEffect, useRef } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
import { useThemeStore } from '../src/store/themeStore';
import { useSoundStore } from '../src/store/soundStore';
import { soundManager } from '../src/utils/soundManager';
import { useTheme } from '../src/hooks/useTheme';
import { MusicIndicator } from '../src/components/common/MusicIndicator';
import { OfflineBanner } from '../src/components/common/OfflineBanner';
import { ErrorBoundary } from '../src/components/common/ErrorBoundary';
import { ACCESS_TOKEN_TTL_MS, TOKEN_REFRESH_MARGIN_MS } from '../src/utils/constants';
import * as SecureStore from 'expo-secure-store';
import { SECURE_KEYS } from '../src/utils/constants';

SplashScreen.preventAutoHideAsync();

// Global unhandled JS error handler — prevents silent crashes
if (global.ErrorUtils) {
  const originalHandler = global.ErrorUtils.getGlobalHandler?.();
  global.ErrorUtils.setGlobalHandler?.((error: Error, isFatal?: boolean) => {
    console.error('[Klink] Global JS error:', error?.message ?? error);
    if (originalHandler) originalHandler(error, isFatal);
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: (failureCount, error: any) => {
        // Do not retry on auth errors or client errors
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
  const { initialize: initTheme } = useThemeStore();
  const { initialize: initSound } = useSoundStore();
  const { isDark } = useTheme();

  // Track whether the session warning has been shown for the current token
  const sessionWarningShownRef = useRef(false);

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
      await Promise.all([initialize(), initTheme(), initSound(), soundManager.initialize()]);
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
          <QueryClientProvider client={queryClient}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="profile/edit" options={{ presentation: 'modal', headerShown: false }} />
              <Stack.Screen name="church/settings" options={{ presentation: 'modal', headerShown: false }} />
              <Stack.Screen name="members/[id]" options={{ presentation: 'modal' }} />
              <Stack.Screen name="giving/new" options={{ presentation: 'modal' }} />
              <Stack.Screen name="giving/history" />
              <Stack.Screen name="projects/index" />
              <Stack.Screen name="projects/[id]" />
              <Stack.Screen name="facilities/index" />
              <Stack.Screen name="events/index" />
              <Stack.Screen name="announcements/index" />
              <Stack.Screen name="sermons/[id]" />
            </Stack>
          </QueryClientProvider>
          {/* Floats over every screen — only visible when music is playing */}
          <MusicIndicator />
          {/* Shows when network is unreachable */}
          <OfflineBanner />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
