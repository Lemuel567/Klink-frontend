import React, { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../src/theme/colors';
import { FontSize, FontWeight } from '../../src/theme/typography';
import { SpringConfig, Duration } from '../../src/theme/animations';
import { useTheme } from '../../src/hooks/useTheme';

// Icon + label per tab route. Every tab is wired to a live backend screen —
// the old sermons "✦" tab moved into the Church hub.
const TAB_META: Record<string, { label: string; icon: string }> = {
  home: { label: 'Home', icon: '⌂' },
  members: { label: 'Members', icon: '👥' },
  giving: { label: 'Give', icon: '♥' },
  church: { label: 'Church', icon: '⛪' },
  profile: { label: 'Profile', icon: '◎' },
};

// 2026-07-12: the directory is open to everyone — the backend returns full
// records to leaders and a limited view (name + phone only) to members.

export default function TabLayout() {
  // Auth guard: nothing behind the tabs renders without a valid session.
  // Covers deep links, expired sessions, and any stray navigation into (tabs).
  const { isAuthenticated, isInitialized, user } = useAuthStore();
  if (isInitialized === false) return null; // still restoring tokens from SecureStore
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  const showMembersTab = true;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Transparent scenes — the root RotatingBackground shows through
        sceneStyle: { backgroundColor: 'transparent' },
        // NO tab-scene animation. 'shift' (tried 2026-07-22) left scenes stuck
        // invisible with the custom tab bar + transparent scenes — content only
        // "flashed" during the next switch. The sliding pill + ScrollReveal
        // choreography provide the motion instead.
      }}
      tabBar={(props) => <KlinkTabBar {...props} />}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="members" options={{ title: 'Members', href: showMembersTab ? undefined : null }} />
      <Tabs.Screen name="giving" options={{ title: 'Give' }} />
      <Tabs.Screen name="church" options={{ title: 'Church' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

function KlinkTabBar({ state, descriptors, navigation }: any) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // Only routes actually shown in the bar (href: null hides e.g. Members for
  // regular members); the pill index is relative to this visible list.
  const visibleRoutes = state.routes.filter(
    (r: any) => descriptors[r.key]?.options?.href !== null,
  );
  const activeKey = state.routes[state.index]?.key;
  const activeIndex = Math.max(0, visibleRoutes.findIndex((r: any) => r.key === activeKey));

  // Sliding pill indicator
  const pillX = useSharedValue(activeIndex);
  const TAB_WIDTH = 100 / Math.max(1, visibleRoutes.length);

  React.useEffect(() => {
    pillX.value = withSpring(activeIndex, SpringConfig.tab);
  }, [activeIndex]);

  const pillStyle = useAnimatedStyle(() => ({
    left: `${pillX.value * TAB_WIDTH}%`,
    width: `${TAB_WIDTH}%`,
  }));

  return (
    // Floating glass dock (2026-07-18 redesign): the bar no longer runs
    // edge-to-edge — it floats as a rounded pill over the worship photo, with
    // a full-height gold pill sliding behind the active tab.
    <View style={[styles.wrap, { paddingBottom: (insets.bottom || 16) + 6 }]}>
      <View style={styles.dock}>
        <BlurView intensity={isDark ? 80 : 60} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, styles.glassOverlay]} />

        {/* Sliding active pill — full height, behind the icons */}
        <Animated.View style={[styles.pill, pillStyle]} />

        {visibleRoutes.map((route: any, index: number) => {
          const meta = TAB_META[route.name] ?? { label: route.name, icon: '•' };
          return (
            <TabItem
              key={route.key}
              tab={{ name: route.name, ...meta }}
              isActive={route.key === activeKey}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                pillX.value = withSpring(index, SpringConfig.tab);
                if (route.key !== activeKey) {
                  const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!event.defaultPrevented) navigation.navigate(route.name);
                }
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

function TabItem({ tab, isActive, onPress }: { tab: { name: string; label: string; icon: string }; isActive: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(isActive ? 1 : 0.5);

  React.useEffect(() => {
    scale.value = withSpring(isActive ? 1.2 : 1, SpringConfig.tab);
    opacity.value = withTiming(isActive ? 1 : 0.5, { duration: Duration.fast });
  }, [isActive]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.tabItem}
      activeOpacity={0.8}
      accessibilityRole="tab"
      accessibilityLabel={tab.label}
      accessibilityState={{ selected: isActive }}
    >
      <Animated.Text style={[styles.icon, iconStyle, { color: isActive ? Colors.gold : Colors.darkMuted }]}>
        {tab.icon}
      </Animated.Text>
      {isActive && (
        <Text style={styles.label}>{tab.label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Transparent outer wrapper — the photo shows all around the floating dock
  wrap: {
    paddingHorizontal: 14,
    paddingTop: 6,
    backgroundColor: 'transparent',
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(244,164,41,0.25)',
    borderTopColor: 'rgba(255,255,255,0.28)', // light edge — light from above
    position: 'relative',
  },
  glassOverlay: {
    // Translucent — the worship photo glows through the blurred dock
    backgroundColor: 'rgba(10,5,32,0.6)',
  },
  // Full-height gold pill behind the active tab (was a thin top line)
  pill: {
    position: 'absolute',
    top: 5,
    bottom: 5,
    backgroundColor: 'rgba(244,164,41,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(244,164,41,0.35)',
    borderRadius: 999,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    minHeight: 52,
    gap: 2,
  },
  icon: {
    fontSize: 22,
  },
  label: {
    color: Colors.gold,
    fontSize: FontSize.micro,
    fontWeight: FontWeight.semiBold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
