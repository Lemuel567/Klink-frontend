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
import { LinearGradient } from 'expo-linear-gradient';
import { Duration } from '../../theme/animations';
import { Colors } from '../../theme/colors';

interface AuroraOrb {
  color: string;
  size: number;
  top: number;
  left: number;
  delay: number;
  duration: number;
}

const ORBS: AuroraOrb[] = [
  { color: Colors.purple, size: 280, top: -80, left: -60, delay: 0, duration: 4000 },
  { color: Colors.gold, size: 200, top: 60, left: 180, delay: 800, duration: 5000 },
  { color: '#1a0a4e', size: 320, top: 200, left: -100, delay: 400, duration: 6000 },
  { color: '#4a2580', size: 180, top: 100, left: 120, delay: 1200, duration: 4500 },
];

function AuroraOrb({ orb }: { orb: AuroraOrb }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      orb.delay,
      withRepeat(
        withTiming(1, { duration: orb.duration, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      )
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [-30, 30]) },
      { translateY: interpolate(progress.value, [0, 1], [-20, 20]) },
      { scale: interpolate(progress.value, [0, 0.5, 1], [1, 1.1, 1]) },
    ],
    opacity: interpolate(progress.value, [0, 0.5, 1], [0.35, 0.55, 0.35]),
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: orb.size,
          height: orb.size,
          borderRadius: orb.size / 2,
          top: orb.top,
          left: orb.left,
          backgroundColor: orb.color,
        },
        animStyle,
      ]}
    />
  );
}

interface Props {
  style?: ViewStyle;
  children?: React.ReactNode;
}

export function AuroraBackground({ style, children }: Props) {
  return (
    <View style={[styles.container, style]}>
      <LinearGradient colors={['#0A0F2E', '#1a0a4e', '#0A0F2E']} style={StyleSheet.absoluteFill} />
      {ORBS.map((orb, i) => (
        <AuroraOrb key={i} orb={orb} />
      ))}
      <View style={[StyleSheet.absoluteFill, styles.overlay]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
  overlay: { backgroundColor: 'rgba(10,15,46,0.3)' },
});
