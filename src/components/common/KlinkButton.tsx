import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useHaptics } from '../../hooks/useHaptics';
import { SpringConfig } from '../../theme/animations';
import { Colors, Gradients } from '../../theme/colors';
import { BorderRadius, Glow, Spacing } from '../../theme/spacing';
import { FontWeight } from '../../theme/typography';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

/**
 * Klink button v2 (2026-07-18 redesign) — same API, new anatomy:
 * pill silhouette, tracked uppercase label, top light-edge (light falls from
 * above), and exactly one luminous accent per screen: the primary CTA's gold
 * glow. Press springs and haptics are unchanged.
 */
export function KlinkButton({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  fullWidth = true,
  icon,
}: Props) {
  const haptics = useHaptics();
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  const handlePressIn = useCallback(() => {
    haptics.light();
    scale.value = withSpring(0.96, SpringConfig.snappy);
    translateY.value = withSpring(2, SpringConfig.snappy);
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SpringConfig.snappy);
    translateY.value = withSpring(0, SpringConfig.snappy);
  }, []);

  const handlePress = useCallback(() => {
    haptics.medium();
    onPress?.();
  }, [onPress]);

  const isDisabled = disabled || loading;

  const labelRow = (spinnerColor: string, labelStyle: object) =>
    loading ? (
      <ActivityIndicator color={spinnerColor} size="small" />
    ) : (
      <View style={styles.row}>
        {icon}
        <Text style={[styles.labelBase, labelStyle, icon ? { marginLeft: 8 } : {}]}>{label}</Text>
      </View>
    );

  if (variant === 'primary') {
    return (
      <AnimatedTouchable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={1}
        // Glow lives on the OUTER view: iOS clips shadows when the same view
        // has overflow:'hidden' (needed inside for the pill's light edge).
        style={[
          animatedStyle,
          styles.glowWrap,
          isDisabled && styles.disabled,
          fullWidth && { width: '100%' },
          style,
        ]}
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
      >
        <LinearGradient
          colors={Gradients.glory}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.base, styles.clip]}
        >
          <View pointerEvents="none" style={styles.lightEdge} />
          {labelRow(Colors.purple, styles.labelPrimary)}
        </LinearGradient>
      </AnimatedTouchable>
    );
  }

  if (variant === 'secondary') {
    return (
      <AnimatedTouchable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={1}
        style={[
          animatedStyle,
          isDisabled && styles.disabled,
          fullWidth && { width: '100%' },
          style,
        ]}
        accessibilityLabel={label}
        accessibilityRole="button"
      >
        <View style={[styles.base, styles.clip, styles.secondaryBase]}>
          <View pointerEvents="none" style={styles.lightEdgeSoft} />
          {labelRow(Colors.gold, styles.labelSecondary)}
        </View>
      </AnimatedTouchable>
    );
  }

  if (variant === 'danger') {
    return (
      <AnimatedTouchable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={1}
        style={[
          animatedStyle,
          isDisabled && styles.disabled,
          fullWidth && { width: '100%' },
          style,
        ]}
        accessibilityLabel={label}
        accessibilityRole="button"
      >
        <LinearGradient
          colors={['#DC2626', '#8F1D1D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.base, styles.clip]}
        >
          <View pointerEvents="none" style={styles.lightEdgeSoft} />
          {labelRow(Colors.white, styles.labelWhite)}
        </LinearGradient>
      </AnimatedTouchable>
    );
  }

  // ghost — quiet bordered pill, honest structure
  return (
    <AnimatedTouchable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[
        animatedStyle,
        isDisabled && styles.disabled,
        fullWidth && { width: '100%' },
        style,
      ]}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <View style={[styles.base, styles.ghostBase]}>
        {labelRow(Colors.gold, styles.labelGhost)}
      </View>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  // Clip children (light edge) to the pill; never on the shadowed wrapper.
  clip: {
    overflow: 'hidden',
  },
  glowWrap: {
    borderRadius: BorderRadius.full,
    ...Glow.gold,
  },
  // 1px highlight along the top of the pill — light falls from above.
  lightEdge: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 1,
  },
  lightEdgeSoft: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondaryBase: {
    backgroundColor: 'rgba(45,27,105,0.55)',
    borderWidth: 1.5,
    borderColor: Colors.gold,
  },
  ghostBase: {
    borderWidth: 1,
    borderColor: 'rgba(244,164,41,0.45)',
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  // Tracked uppercase label — the jewelry-button voice. Smaller size + wide
  // tracking stays narrower than the old 16px sentence-case label.
  labelBase: {
    fontSize: 13.5,
    fontWeight: FontWeight.bold,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  labelPrimary: { color: Colors.purple },
  labelSecondary: { color: Colors.gold },
  labelWhite: { color: Colors.white },
  labelGhost: { color: Colors.gold },
});
