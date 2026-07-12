import React, { ReactNode } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { SpringConfig } from '../../theme/animations';

/**
 * Tilt3DCard — a card that tilts in 3D toward the user's touch point,
 * with the inner content shifting slightly opposite for parallax depth.
 * Springs back to flat on release. Max tilt is capped for subtlety.
 *
 * Implements the skill's "3D Tilt Cards" + Step 3 "3D Card tilt".
 */
export interface Tilt3DCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Max degrees of tilt on each axis. Default 12 (skill: never exceed ~12°). */
  maxTilt?: number;
  /** Approx card size used to normalise the touch position. */
  width?: number;
  height?: number;
  onPress?: () => void;
}

export function Tilt3DCard({
  children,
  style,
  maxTilt = 12,
  width = 320,
  height = 200,
  onPress,
}: Tilt3DCardProps) {
  // -1..1 normalised touch offset from centre.
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const pressed = useSharedValue(0);

  const pan = Gesture.Pan()
    .onBegin((e) => {
      pressed.value = withSpring(1, SpringConfig.snappy);
      tx.value = (e.x / width) * 2 - 1;
      ty.value = (e.y / height) * 2 - 1;
    })
    .onUpdate((e) => {
      tx.value = Math.max(-1, Math.min(1, (e.x / width) * 2 - 1));
      ty.value = Math.max(-1, Math.min(1, (e.y / height) * 2 - 1));
    })
    .onFinalize(() => {
      tx.value = withSpring(0, SpringConfig.bouncy);
      ty.value = withSpring(0, SpringConfig.bouncy);
      pressed.value = withSpring(0, SpringConfig.snappy);
    });

  const tap = Gesture.Tap().onEnd(() => {
    if (onPress) onPress();
  });

  const composed = Gesture.Simultaneous(pan, tap);

  const cardStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(tx.value, [-1, 1], [-maxTilt, maxTilt]);
    const rotateX = interpolate(ty.value, [-1, 1], [maxTilt, -maxTilt]);
    const scale = interpolate(pressed.value, [0, 1], [1, 0.98]);
    return {
      transform: [
        { perspective: 800 },
        { rotateX: `${rotateX}deg` },
        { rotateY: `${rotateY}deg` },
        { scale },
      ],
    };
  });

  // Inner content drifts slightly opposite the tilt for depth.
  const innerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(tx.value, [-1, 1], [6, -6]) },
      { translateY: interpolate(ty.value, [-1, 1], [6, -6]) },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[cardStyle, style]}>
        <Animated.View style={innerStyle}>{children}</Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

export default Tilt3DCard;
