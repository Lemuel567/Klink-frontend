import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  width: number;
  height: number;
  style?: ViewStyle;
}

export function HolographicShimmer({ width, height, style }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.value, [0, 1], [-width, width]) }],
  }));

  return (
    <Animated.View style={[{ width, height, overflow: 'hidden', borderRadius: 8 }, style]}>
      <LinearGradient
        colors={['rgba(45,27,105,0.1)', 'rgba(244,164,41,0.3)', 'rgba(45,27,105,0.1)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[StyleSheet.absoluteFill]}
      />
      <Animated.View style={[styles.shimmer, { width }, shimmerStyle]}>
        <LinearGradient
          colors={[
            'rgba(255,255,255,0)',
            'rgba(255,255,255,0.15)',
            'rgba(255,255,255,0.3)',
            'rgba(255,255,255,0.15)',
            'rgba(255,255,255,0)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: width * 0.6, height }}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shimmer: { position: 'absolute', top: 0 },
});
