import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Duration } from '../../theme/animations';
import { Colors } from '../../theme/colors';

interface Props {
  style?: ViewStyle;
  children?: React.ReactNode;
}

// Cycles through 3 gradient states matching worship palette
export function GradientMorph({ style, children }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: Duration.gradientMorph }),
        withTiming(2, { duration: Duration.gradientMorph }),
        withTiming(0, { duration: Duration.gradientMorph }),
      ),
      -1,
      false,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const color1 = interpolateColor(
      progress.value,
      [0, 1, 2],
      [Colors.purple, Colors.navy, Colors.purpleLight],
    );
    const color2 = interpolateColor(
      progress.value,
      [0, 1, 2],
      [Colors.purpleLight, Colors.purple, Colors.gold],
    );
    return { opacity: 1 };
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, animatedStyle, style]}>
      <LinearGradient
        colors={[Colors.purple, Colors.purpleLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </Animated.View>
  );
}
