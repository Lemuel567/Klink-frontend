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
  Easing,
  interpolate,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
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
  const flash = useSharedValue(0);
  const ring = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  // Light sweep across the button face at the moment of the pop
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  // Gold shockwave ring bursting OUTWARD around the pill — visible around the
  // thumb even while it covers the button itself.
  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ring.value, [0, 0.12, 1], [0, 0.9, 0]),
    transform: [
      { scaleX: interpolate(ring.value, [0, 1], [1, 1.18]) },
      { scaleY: interpolate(ring.value, [0, 1], [1, 1.9]) },
    ],
  }));

  const handlePressIn = useCallback(() => {
    haptics.light();
    // Anticipation: a quick squeeze down…
    scale.value = withSpring(0.93, SpringConfig.snappy);
    translateY.value = withSpring(2, SpringConfig.snappy);
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SpringConfig.snappy);
    translateY.value = withSpring(0, SpringConfig.snappy);
  }, []);

  const handlePress = useCallback(() => {
    haptics.medium();
    // …then the POP: overshoot well past resting size and bounce back, the
    // face flashes bright, and a gold shockwave ring bursts outward.
    scale.value = withSequence(
      withSpring(1.12, { damping: 5, stiffness: 340, mass: 0.6 }),
      withSpring(1, SpringConfig.bouncy),
    );
    translateY.value = withSequence(
      withSpring(-3, { damping: 5, stiffness: 340, mass: 0.6 }),
      withSpring(0, SpringConfig.default),
    );
    flash.value = withSequence(
      withTiming(0.6, { duration: 70 }),
      withTiming(0, { duration: 320 }),
    );
    ring.value = 0;
    ring.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) });
    onPress?.();
  }, [onPress]);

  // White wash overlay — rendered inside each variant's clipped pill
  const popFlash = (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, styles.flash, flashStyle]}
    />
  );

  // Shockwave — rendered on the UNCLIPPED touchable so it can spill outward
  const popRing = (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.ring, ringStyle]} />
  );

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
          {popFlash}
        </LinearGradient>
        {popRing}
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
          {popFlash}
        </View>
        {popRing}
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
          {popFlash}
        </LinearGradient>
        {popRing}
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
        {popFlash}
      </View>
      {popRing}
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
  // White wash that flashes over the face on the pop — its own radius so it
  // stays pill-shaped even where the container doesn't clip (ghost).
  flash: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.full,
  },
  // Gold shockwave outline that bursts outward on the pop
  ring: {
    borderRadius: BorderRadius.full,
    borderWidth: 2.5,
    borderColor: Colors.gold,
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
