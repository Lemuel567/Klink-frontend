import React, { useEffect, useRef } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';
import { Duration, EasingPresets } from '../../theme/animations';

interface Props {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;
  /** Starting scale of the settle-in; pass 1 to disable the zoom component. */
  scaleFrom?: number;
  /** Replay the entrance whenever the screen regains focus (tab switch, back
      navigation) — the whole page composes itself again, PowerPoint-style.
      Default true. */
  replayOnFocus?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Cinematic entrance spring: real travel with a soft overshoot, so elements
// "fly in and land" instead of drifting. Transform/opacity only — stays on
// the UI thread at 60fps regardless of how many elements animate at once.
// Tuned slower (2026-07-22 user feedback: "too fast") — a calm ~700ms glide.
const ENTER_SPRING = { damping: 18, stiffness: 80, mass: 1 };

export function ScrollReveal({
  children,
  delay = 0,
  direction = 'up',
  distance = 48,
  scaleFrom = 0.94,
  replayOnFocus = true,
  style,
}: Props) {
  const reducedMotion = useReducedMotion();
  const isFocused = useIsFocused();

  const opacity = useSharedValue(reducedMotion ? 1 : 0);
  const offset = useSharedValue(reducedMotion ? 0 : distance);
  const scale = useSharedValue(reducedMotion ? 1 : scaleFrom);

  const hasEnteredRef = useRef(false);
  const wasFocusedRef = useRef(false);

  // FAIL-SAFE RULE (2026-07-22): content is NEVER parked hidden. An earlier
  // version reset elements to invisible while their screen was away — if the
  // JS thread lagged (dev mode over a tunnel), returning screens stayed blank
  // until the focus effect ran, then "flashed" in. Now the rewind happens in
  // the SAME tick as the replay animation, so the worst possible failure mode
  // is "no replay", never "invisible content".
  useEffect(() => {
    if (reducedMotion) return;
    const wasFocused = wasFocusedRef.current;
    wasFocusedRef.current = isFocused;
    if (!isFocused) return; // leave everything visible while parked

    if (hasEnteredRef.current) {
      if (!replayOnFocus || wasFocused) return;
      // Returning to this screen — rewind and replay in one tick
      opacity.value = 0;
      offset.value = distance;
      scale.value = scaleFrom;
    }
    hasEnteredRef.current = true;

    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: Duration.slow, easing: EasingPresets.enter }),
    );
    offset.value = withDelay(delay, withSpring(0, ENTER_SPRING));
    scale.value = withDelay(delay, withSpring(1, ENTER_SPRING));

    // Safety net: whatever happens to the animation above (cancelled, lost in
    // a fast-refresh, interrupted mid-flight), the content MUST end up fully
    // visible. Snapping to the final pose is a no-op when all went well.
    const safety = setTimeout(() => {
      opacity.value = withTiming(1, { duration: 150 });
      offset.value = withTiming(0, { duration: 150 });
      scale.value = withTiming(1, { duration: 150 });
    }, delay + 1500);
    return () => clearTimeout(safety);
  }, [isFocused, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => {
    const isVertical = direction === 'up' || direction === 'down';
    const sign = direction === 'down' || direction === 'right' ? -1 : 1;
    return {
      opacity: opacity.value,
      transform: [
        isVertical
          ? { translateY: offset.value * sign }
          : { translateX: offset.value * sign },
        { scale: scale.value },
      ],
    };
  });

  return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
}
