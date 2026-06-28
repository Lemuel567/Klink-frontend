import React, { useEffect } from 'react';
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

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

export default function RootLayout() {
  const { initialize } = useAuthStore();
  const { initialize: initTheme } = useThemeStore();
  const { initialize: initSound } = useSoundStore();
  const { isDark } = useTheme();

  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_700Bold,
    PlayfairDisplay_700Bold_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    async function prepare() {
      await Promise.all([initialize(), initTheme(), initSound(), soundManager.initialize()]);
      if (fontsLoaded || fontError) {
        await SplashScreen.hideAsync();
      }
    }
    prepare();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
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
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
