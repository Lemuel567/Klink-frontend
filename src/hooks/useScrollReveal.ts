import { useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { Duration, EasingPresets } from '../theme/animations';

export function useScrollReveal(delay = 0) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(30);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: Duration.medium, easing: EasingPresets.enter }),
    );
    translateY.value = withDelay(
      delay,
      withTiming(0, { duration: Duration.medium, easing: EasingPresets.enter }),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return animatedStyle;
}
