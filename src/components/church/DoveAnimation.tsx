import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../../theme/colors';

const DOVE_PATH =
  'M12 2C8 2 4 6 4 10c0 2 1 3 2 4L2 18l6-2c2 2 5 3 8 2 5-1 9-6 8-11C23 3 18 1 12 2zm0 2c4 0 7 3 7 6 0 2-2 4-4 5-3 1-6 0-8-2L5 12l-1 3 2-1c1 2 4 3 6 3 4 0 7-3 7-7 0-3-3-5-7-5z';

interface Props {
  size?: number;
  color?: string;
  style?: ViewStyle;
}

export function DoveAnimation({ size = 60, color = Colors.white, style }: Props) {
  const wingFlap = useSharedValue(0);
  const float = useSharedValue(0);

  useEffect(() => {
    wingFlap.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 400, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    float.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  const doveStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(float.value, [0, 1], [0, -12]) },
      { scaleX: interpolate(wingFlap.value, [0, 0.5, 1], [1, 1.05, 1]) },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(float.value, [0, 0.5, 1], [0.3, 0.7, 0.3]),
    transform: [{ scale: interpolate(float.value, [0, 1], [1, 1.2]) }],
  }));

  return (
    <View style={[styles.container, { width: size * 2, height: size * 2 }, style]}>
      <Animated.View style={[styles.glow, { width: size * 1.4, height: size * 1.4, borderRadius: size * 0.7, top: size * 0.3, left: size * 0.3 }, glowStyle]} />
      <Animated.View style={doveStyle}>
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d={DOVE_PATH} fill={color} opacity={0.9} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  glow: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
});
