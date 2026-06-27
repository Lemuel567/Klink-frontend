import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../../theme/colors';

interface CrossData {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
}

function CrossParticle({ cross }: { cross: CrossData }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      cross.delay,
      withRepeat(
        withTiming(1, { duration: cross.duration, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      )
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0.1, 0.5, 0.1]),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [0, -20]) },
      { rotate: `${interpolate(progress.value, [0, 1], [-5, 5])}deg` },
    ],
  }));

  const crossPath = `M${cross.size / 2},0 L${cross.size / 2},${cross.size} M0,${cross.size * 0.35} L${cross.size},${cross.size * 0.35}`;

  return (
    <Animated.View
      style={[{ position: 'absolute', left: cross.x, top: cross.y, width: cross.size, height: cross.size }, animStyle]}
    >
      <Svg width={cross.size} height={cross.size}>
        <Path d={crossPath} stroke={Colors.gold} strokeWidth="1.5" strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}

interface Props {
  count?: number;
  containerWidth?: number;
  containerHeight?: number;
  style?: ViewStyle;
}

export function CrossParticles({ count = 10, containerWidth = 300, containerHeight = 400, style }: Props) {
  const crosses: CrossData[] = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * (containerWidth - 30),
    y: Math.random() * (containerHeight - 40),
    size: 12 + Math.random() * 16,
    delay: Math.random() * 2000,
    duration: 3000 + Math.random() * 3000,
  }));

  return (
    <View style={[{ width: containerWidth, height: containerHeight, overflow: 'hidden' }, style]}>
      {crosses.map((c) => (
        <CrossParticle key={c.id} cross={c} />
      ))}
    </View>
  );
}
