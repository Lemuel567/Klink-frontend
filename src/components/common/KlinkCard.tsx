import React, { useCallback } from 'react';
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { SpringConfig } from '../../theme/animations';
import { BorderRadius, Shadows, Spacing } from '../../theme/spacing';
import { Colors } from '../../theme/colors';

type CardVariant = 'default' | 'glass' | 'gradient';

interface Props {
  children: React.ReactNode;
  variant?: CardVariant;
  style?: ViewStyle;
  onPress?: () => void;
  padded?: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function KlinkCard({ children, variant = 'default', style, onPress, padded = true }: Props) {
  const { theme, isDark } = useTheme();
  const haptics = useHaptics();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (!onPress) return;
    haptics.light();
    scale.value = withSpring(0.97, SpringConfig.snappy);
  }, [onPress]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SpringConfig.snappy);
  }, []);

  const cardStyle = [
    styles.base,
    padded && styles.padded,
    variant === 'default' && {
      backgroundColor: theme.card,
      ...(isDark ? Shadows.dark.card : Shadows.light.card),
    },
    style,
  ];

  if (variant === 'glass') {
    return (
      <AnimatedTouchable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={onPress ? 1 : 1}
        disabled={!onPress}
        style={[animatedStyle, styles.base, padded && styles.padded, style]}
        accessibilityRole={onPress ? 'button' : undefined}
      >
        <BlurView
          intensity={40}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={[StyleSheet.absoluteFill, styles.glassBorder]} />
        {children}
      </AnimatedTouchable>
    );
  }

  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={onPress ? 1 : 1}
      disabled={!onPress}
      style={[animatedStyle, ...cardStyle]}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      {children}
    </AnimatedTouchable>
  );
}

export function GlassmorphismCard({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}) {
  const { isDark } = useTheme();
  const haptics = useHaptics();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={() => {
        if (!onPress) return;
        haptics.light();
        scale.value = withSpring(0.97, SpringConfig.snappy);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SpringConfig.snappy);
      }}
      disabled={!onPress}
      activeOpacity={1}
      style={[animatedStyle, styles.glassCard, style]}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <BlurView
        intensity={isDark ? 20 : 40}
        tint={isDark ? 'dark' : 'light'}
        style={[StyleSheet.absoluteFill, { borderRadius: BorderRadius.xl }]}
      />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: BorderRadius.xl,
            backgroundColor: isDark ? Colors.glassDark : Colors.glassLight,
            borderWidth: 1,
            borderColor: Colors.glassBorder,
          },
        ]}
      />
      {children}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  padded: {
    padding: Spacing.cardPadding,
  },
  glassBorder: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.glassLight,
  },
  glassCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    padding: Spacing.cardPadding,
  },
});
