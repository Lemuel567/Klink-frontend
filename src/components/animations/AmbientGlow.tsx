import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface Props {
  /** rgba fill — keep alpha low (0.1–0.2); the blob is atmosphere, not a shape. */
  color?: string;
  size?: number;
  /** Position the blob via top/left/right/bottom here. */
  style?: ViewStyle;
  driftX?: number;
  driftY?: number;
  durationMs?: number;
}

/**
 * Ambient light blob (ui-ux-pro-max "Modern Dark / Cinema Mobile" spec:
 * "animated ambient light blobs — Reanimated translateX/Y slow oscillation").
 * A soft glowing circle that drifts slowly behind glass surfaces. Pure View +
 * shadow glow — no new dependencies. Gated by reduced motion.
 */
export function AmbientGlow({
  color = 'rgba(244,164,41,0.14)',
  size = 280,
  style,
  driftX = 26,
  driftY = 18,
  durationMs = 11000,
}: Props) {
  const t = useSharedValue(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    t.value = withRepeat(
      withTiming(1, { duration: durationMs, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, durationMs]);

  const drift = useAnimatedStyle(() => ({
    transform: [{ translateX: t.value * driftX }, { translateY: t.value * driftY }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.blob,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          shadowColor: color,
        },
        style,
        drift,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 60,
  },
});
