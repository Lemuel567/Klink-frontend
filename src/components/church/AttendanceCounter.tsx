import React, { useEffect } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedProps, withTiming, Easing } from 'react-native-reanimated';
import { Colors } from '../../theme/colors';
import { FontSize, FontWeight } from '../../theme/typography';
import { Duration, SpringConfig } from '../../theme/animations';

const AnimatedText = Animated.createAnimatedComponent(Text);

interface Props {
  count: number;
  total: number;
  label?: string;
  style?: ViewStyle;
}

export function AttendanceCounter({ count, total, label = 'Present today', style }: Props) {
  const displayValue = useSharedValue(0);
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  useEffect(() => {
    displayValue.value = withTiming(count, {
      duration: Duration.verySlow,
      easing: Easing.out(Easing.quad),
    });
  }, [count]);

  const animatedProps = useAnimatedProps(() => ({
    text: String(Math.round(displayValue.value)),
  } as any));

  const ringPct = total > 0 ? count / total : 0;
  const circumference = 2 * Math.PI * 40;
  const dash = ringPct * circumference;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.ring}>
        <View style={styles.ringTrack} />
        <View style={[styles.ringFill, { transform: [{ rotate: '-90deg' }] }]} />
        <View style={styles.ringCenter}>
          <AnimatedText style={styles.count} animatedProps={animatedProps} />
          <Text style={styles.total}>/ {total}</Text>
        </View>
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.percentage}>{percentage}% attendance rate</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 8 },
  ring: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 6,
    borderColor: 'rgba(45,27,105,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringTrack: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 50,
    borderWidth: 6,
    borderColor: 'rgba(45,27,105,0.1)',
  },
  ringFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 50,
  },
  ringCenter: { alignItems: 'center' },
  count: { color: Colors.gold, fontSize: FontSize.h3, fontWeight: FontWeight.bold },
  total: { color: Colors.darkMuted, fontSize: FontSize.caption },
  label: { color: Colors.white, fontSize: FontSize.body, fontWeight: FontWeight.medium },
  percentage: { color: Colors.darkMuted, fontSize: FontSize.small },
});
