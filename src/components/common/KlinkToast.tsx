import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Colors } from '../../theme/colors';
import { FontSize, FontWeight } from '../../theme/typography';
import { BorderRadius, Spacing, ZIndex } from '../../theme/spacing';
import { SpringConfig, Duration } from '../../theme/animations';

type ToastType = 'success' | 'error' | 'warning' | 'info';

const TYPE_CONFIG: Record<ToastType, { color: string; icon: string }> = {
  success: { color: '#22c55e', icon: '✓' },
  error: { color: '#ef4444', icon: '✕' },
  warning: { color: Colors.gold, icon: '⚠' },
  info: { color: Colors.purple, icon: 'ℹ' },
};

interface Props {
  message: string;
  type?: ToastType;
  visible: boolean;
  onHide?: () => void;
  duration?: number;
}

export function KlinkToast({ message, type = 'info', visible, onHide, duration = 3000 }: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, SpringConfig.snappy);
      opacity.value = withTiming(1, { duration: Duration.fast });
      if (onHide) {
        opacity.value = withDelay(
          duration,
          withTiming(0, { duration: Duration.normal }, () => runOnJS(onHide)())
        );
      }
    } else {
      translateY.value = withTiming(-100, { duration: Duration.normal });
      opacity.value = withTiming(0, { duration: Duration.fast });
    }
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const { color, icon } = TYPE_CONFIG[type];

  return (
    <Animated.View
      style={[
        styles.container,
        { top: insets.top + Spacing.sm },
        containerStyle,
      ]}
      pointerEvents="none"
    >
      <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.overlay]} />
      <View style={[styles.accent, { backgroundColor: color }]} />
      <View style={styles.content}>
        <Text style={[styles.icon, { color }]}>{icon}</Text>
        <Text style={styles.message} numberOfLines={2}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.pagePadding,
    right: Spacing.pagePadding,
    zIndex: ZIndex.toast,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
  overlay: { backgroundColor: 'rgba(10,15,46,0.85)', borderRadius: BorderRadius.xl },
  accent: { width: 4, alignSelf: 'stretch' },
  content: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md },
  icon: { fontSize: 18, fontWeight: FontWeight.bold },
  message: { flex: 1, color: Colors.white, fontSize: FontSize.body },
});
