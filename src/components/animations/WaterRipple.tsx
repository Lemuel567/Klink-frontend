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

interface RippleProps {
  delay: number;
  color: string;
  maxSize: number;
}

function Ripple({ delay, color, maxSize }: RippleProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 2500, easing: Easing.out(Easing.quad) }),
        -1,
        false
      )
    );
  }, []);

  const animStyle = useAnimatedStyle(() => {
    const size = interpolate(progress.value, [0, 1], [0, maxSize]);
    return {
      width: size,
      height: size,
      borderRadius: size / 2,
      opacity: interpolate(progress.value, [0, 0.3, 1], [0, 0.6, 0]),
      marginLeft: -size / 2,
      marginTop: -size / 2,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: '50%',
          left: '50%',
          borderWidth: 1.5,
          borderColor: color,
        },
        animStyle,
      ]}
    />
  );
}

interface Props {
  color?: string;
  maxSize?: number;
  count?: number;
  style?: ViewStyle;
}

export function WaterRipple({
  color = 'rgba(244,164,41,0.5)',
  maxSize = 200,
  count = 3,
  style,
}: Props) {
  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: count }, (_, i) => (
        <Ripple key={i} delay={i * (2500 / count)} color={color} maxSize={maxSize} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
});
