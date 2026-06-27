import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, interpolate, SharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Gradients } from '../../theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../theme/typography';
import { Spacing, ZIndex } from '../../theme/spacing';
import { useHaptics } from '../../hooks/useHaptics';

interface Props {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: { label: string; onPress: () => void };
  scrollY?: SharedValue<number>;
  transparent?: boolean;
  style?: ViewStyle;
}

export function KlinkHeader({
  title,
  subtitle,
  showBack = false,
  rightAction,
  scrollY,
  transparent = false,
  style,
}: Props) {
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();

  const headerStyle = useAnimatedStyle(() => {
    if (!scrollY) return { opacity: 1 };
    return {
      opacity: interpolate(scrollY.value, [0, 80], [transparent ? 0 : 1, 1]),
    };
  });

  return (
    <Animated.View style={[styles.container, { paddingTop: insets.top }, headerStyle, style]}>
      {!transparent && <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />}
      <View style={[StyleSheet.absoluteFill, styles.overlay]} />

      <View style={styles.row}>
        {showBack && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => { haptics.light(); router.back(); }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
        )}

        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
        </View>

        {rightAction && (
          <TouchableOpacity
            style={styles.rightBtn}
            onPress={() => { haptics.light(); rightAction.onPress(); }}
            accessibilityRole="button"
            accessibilityLabel={rightAction.label}
          >
            <Text style={styles.rightLabel}>{rightAction.label}</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: ZIndex.sticky,
    overflow: 'hidden',
  },
  overlay: { backgroundColor: 'rgba(10,15,46,0.6)' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.pagePadding,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    minHeight: 56,
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
  backIcon: { color: Colors.white, fontSize: 32, lineHeight: 36 },
  titleBlock: { flex: 1 },
  title: {
    color: Colors.white,
    fontSize: FontSize.h4,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.tight,
  },
  subtitle: { color: Colors.darkMuted, fontSize: FontSize.caption, marginTop: 1 },
  rightBtn: { minWidth: 44, height: 44, justifyContent: 'center', alignItems: 'flex-end' },
  rightLabel: { color: Colors.gold, fontSize: FontSize.body, fontWeight: FontWeight.medium },
});
