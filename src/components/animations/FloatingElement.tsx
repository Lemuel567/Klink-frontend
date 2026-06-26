import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Duration, EasingPresets } from '../../theme/animations';

interface Props {
  children: React.ReactNode;
  amplitude?: number;
  duration?: number;
  rotateAmplitude?: number;
}

export function FloatingElement({
  children,
  amplitude = 8,
  duration = Duration.ambient,
  rotateAmplitude = 3,
}: Props) {
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-amplitude, { duration, easing: EasingPresets.float }),
        withTiming(amplitude, { duration, easing: EasingPresets.float }),
      ),
      -1,
      true,
    );
    rotate.value = withRepeat(
      withSequence(
        withTiming(-rotateAmplitude, { duration: duration * 0.75, easing: EasingPresets.float }),
        withTiming(rotateAmplitude, { duration: duration * 0.75, easing: EasingPresets.float }),
      ),
      -1,
      true,
    );
    scale.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: duration * 0.5, easing: EasingPresets.float }),
        withTiming(1.0, { duration: duration * 0.5, easing: EasingPresets.float }),
      ),
      -1,
      true,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}
