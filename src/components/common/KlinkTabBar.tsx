import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Colors } from '../../theme/colors';
import { FontSize, FontWeight } from '../../theme/typography';
import { BorderRadius, ZIndex } from '../../theme/spacing';
import { SpringConfig } from '../../theme/animations';
import { useHaptics } from '../../hooks/useHaptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TABS = ['home', 'members', 'giving', 'sermons', 'profile'];
const TAB_ICONS: Record<string, string> = {
  home: '⌂',
  members: '👥',
  giving: '♥',
  sermons: '✦',
  profile: '◎',
};
const TAB_LABELS: Record<string, string> = {
  home: 'Home',
  members: 'Members',
  giving: 'Give',
  sermons: 'Sermons',
  profile: 'Profile',
};

export function KlinkTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const haptics = useHaptics();
  const pillX = useSharedValue(0);
  const TAB_W = SCREEN_WIDTH / TABS.length;

  useEffect(() => {
    pillX.value = withSpring(state.index * TAB_W, SpringConfig.tab);
  }, [state.index]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
  }));

  return (
    <View style={styles.container}>
      <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.overlay]} />

      {/* Gold top-pill indicator */}
      <Animated.View style={[styles.pill, { width: TAB_W }, pillStyle]} />

      <View style={styles.tabRow}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const icon = TAB_ICONS[route.name] ?? '·';
          const label = TAB_LABELS[route.name] ?? route.name;

          const tabIconStyle = useAnimatedStyle(() => ({
            transform: [
              {
                scale: withSpring(isFocused ? 1.2 : 1, SpringConfig.tab),
              },
            ],
          }));

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              haptics.tab();
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={label}
            >
              <Animated.Text style={[styles.icon, { color: isFocused ? Colors.gold : Colors.darkMuted }, tabIconStyle]}>
                {icon}
              </Animated.Text>
              <Text style={[styles.label, { color: isFocused ? Colors.gold : Colors.darkMuted }]} numberOfLines={1}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    zIndex: ZIndex.sticky,
  },
  overlay: { backgroundColor: 'rgba(10,15,46,0.75)' },
  pill: {
    position: 'absolute',
    top: 0,
    height: 2,
    backgroundColor: Colors.gold,
    borderRadius: BorderRadius.full,
  },
  tabRow: { flexDirection: 'row', paddingBottom: 24, paddingTop: 10 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44, gap: 3 },
  icon: { fontSize: 20 },
  label: { fontSize: FontSize.micro, fontWeight: FontWeight.medium },
});
