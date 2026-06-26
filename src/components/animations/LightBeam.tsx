import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Stop, Polygon } from 'react-native-svg';

interface Props {
  style?: ViewStyle;
  opacity?: number;
}

// Radiates 6 soft light beams from the top center
export function LightBeam({ style, opacity = 0.12 }: Props) {
  const rotate = useSharedValue(0);

  useEffect(() => {
    rotate.value = withRepeat(
      withTiming(360, { duration: 120_000 }),
      -1,
      false,
    );
  }, []);

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));

  const beams = [0, 30, 60, 90, 120, 150];

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity }, style, rotateStyle]}>
      <Svg width="100%" height="100%" viewBox="0 0 400 800">
        <Defs>
          <LinearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="white" stopOpacity="0.6" />
            <Stop offset="1" stopColor="white" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {beams.map((angle, i) => (
          <Polygon
            key={i}
            points="200,0 160,800 240,800"
            fill="url(#beam)"
            transform={`rotate(${angle - 90}, 200, 0)`}
            opacity={0.6 - i * 0.08}
          />
        ))}
      </Svg>
    </Animated.View>
  );
}
