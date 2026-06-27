import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { Duration, EasingPresets } from '../../theme/animations';

interface Props {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;
  style?: StyleProp<ViewStyle>;
}

export function ScrollReveal({
  children,
  delay = 0,
  direction = 'up',
  distance = 30,
  style,
}: Props) {
  const opacity = useSharedValue(0);
  const offset = useSharedValue(distance);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: Duration.medium, easing: EasingPresets.enter }));
    offset.value = withDelay(delay, withTiming(0, { duration: Duration.medium, easing: EasingPresets.enter }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const isVertical = direction === 'up' || direction === 'down';
    const sign = direction === 'down' || direction === 'right' ? -1 : 1;
    return {
      opacity: opacity.value,
      transform: isVertical
        ? [{ translateY: offset.value * sign }]
        : [{ translateX: offset.value * sign }],
    };
  });

  return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
}
