import React, { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Tabs } from 'expo-router';
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

const TABS = [
  { name: 'home', label: 'Home', icon: '⌂' },
  { name: 'members', label: 'Members', icon: '👥' },
  { name: 'giving', label: 'Give', icon: '♥' },
  { name: 'sermons', label: 'Sermons', icon: '✦' },
  { name: 'profile', label: 'Profile', icon: '◎' },
] as const;

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <KlinkTabBar {...props} />}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="members" options={{ title: 'Members' }} />
      <Tabs.Screen name="giving" options={{ title: 'Give' }} />
      <Tabs.Screen name="sermons" options={{ title: 'Sermons' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

function KlinkTabBar({ state, navigation }: any) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const activeIndex = state.index;

  // Sliding pill indicator
  const pillX = useSharedValue(activeIndex);
  const TAB_WIDTH = 100 / TABS.length;

  const pillStyle = useAnimatedStyle(() => ({
    left: `${pillX.value * TAB_WIDTH}%`,
    width: `${TAB_WIDTH}%`,
  }));

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom || 16 }]}>
      <BlurView intensity={isDark ? 80 : 60} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.glassOverlay]} />

      {/* Sliding indicator */}
      <Animated.View style={[styles.pill, pillStyle]} />

      {TABS.map((tab, index) => (
        <TabItem
          key={tab.name}
          tab={tab}
          isActive={activeIndex === index}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            pillX.value = withSpring(index, SpringConfig.tab);
            if (activeIndex !== index) {
              const event = navigation.emit({ type: 'tabPress', target: state.routes[index].key, canPreventDefault: true });
              if (!event.defaultPrevented) navigation.navigate(state.routes[index].name);
            }
          }}
        />
      ))}
    </View>
  );
}

function TabItem({ tab, isActive, onPress }: { tab: typeof TABS[number]; isActive: boolean; onPress: () => void }) {
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
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    position: 'relative',
    overflow: 'hidden',
  },
  glassOverlay: {
    backgroundColor: 'rgba(10,15,46,0.85)',
  },
  pill: {
    position: 'absolute',
    top: 6,
    height: 4,
    backgroundColor: Colors.gold,
    borderRadius: 2,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    minHeight: 44,
    gap: 2,
  },
  icon: {
    fontSize: 22,
  },
  label: {
    color: Colors.gold,
    fontSize: FontSize.micro,
    fontWeight: FontWeight.semiBold,
    letterSpacing: 0.3,
  },
});
