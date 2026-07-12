import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { BorderRadius, Spacing } from '../../theme/spacing';

type GlassVariant = 'light' | 'purple' | 'gold' | 'dark';

interface Props {
  children: React.ReactNode;
  variant?: GlassVariant;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  padded?: boolean;
}

// Tints extracted from the worship photos: stage purple, worship gold, deep navy
const VARIANTS: Record<GlassVariant, { bg: string; border: string; blur: number }> = {
  light:  { bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.15)', blur: 20 },
  purple: { bg: 'rgba(45,27,105,0.40)',   border: 'rgba(107,63,160,0.40)',  blur: 20 },
  gold:   { bg: 'rgba(244,164,41,0.15)',  border: 'rgba(244,164,41,0.30)',  blur: 20 },
  dark:   { bg: 'rgba(10,15,46,0.60)',    border: 'rgba(255,255,255,0.10)', blur: 15 },
};

/** Frosted glass card tinted to complement the church photos behind it. */
export function GlassCard({ children, variant = 'light', style, intensity, padded = true }: Props) {
  const v = VARIANTS[variant];
  return (
    <View style={[styles.base, padded && styles.padded, style]}>
      <BlurView intensity={intensity ?? v.blur * 2} tint="dark" style={StyleSheet.absoluteFill} />
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: v.bg, borderWidth: 1, borderColor: v.border, borderRadius: BorderRadius.xl },
        ]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  padded: { padding: Spacing.md },
});
