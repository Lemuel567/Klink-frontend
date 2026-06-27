import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';

interface Particle {
  id: number;
  x: number;
  startY: number;
  size: number;
  delay: number;
  duration: number;
  color: string;
}

interface Props {
  count?: number;
  colors?: string[];
  containerWidth?: number;
  containerHeight?: number;
  style?: ViewStyle;
}

function FloatingParticle({ particle }: { particle: Particle }) {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      particle.delay,
      withRepeat(
        withTiming(1, { duration: particle.duration, easing: Easing.linear }),
        -1,
        false
      )
    );
    opacity.value = withDelay(
      particle.delay,
      withRepeat(
        withSequence(
          withTiming(0.8, { duration: particle.duration * 0.2 }),
          withTiming(0.8, { duration: particle.duration * 0.6 }),
          withTiming(0, { duration: particle.duration * 0.2 })
        ),
        -1,
        false
      )
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: progress.value * -particle.startY }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: particle.x,
          bottom: 0,
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 2,
          backgroundColor: particle.color,
        },
        animStyle,
      ]}
    />
  );
}

export function ParticleSystem({
  count = 20,
  colors = ['rgba(244,164,41,0.6)', 'rgba(255,255,255,0.4)', 'rgba(180,120,255,0.5)'],
  containerWidth = 300,
  containerHeight = 400,
  style,
}: Props) {
  const particles: Particle[] = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * containerWidth,
    startY: containerHeight * (0.4 + Math.random() * 0.6),
    size: Math.random() * 4 + 2,
    delay: Math.random() * 3000,
    duration: 3000 + Math.random() * 4000,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));

  return (
    <View style={[{ width: containerWidth, height: containerHeight, overflow: 'hidden' }, style]}>
      {particles.map((p) => (
        <FloatingParticle key={p.id} particle={p} />
      ))}
    </View>
  );
}
