import React from 'react';
import { Dimensions, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';
import { LightBeam } from '../animations/LightBeam';
import { Colors, Gradients } from '../../theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';

const { width, height } = Dimensions.get('window');

interface Props {
  title: string;
  subtitle?: string;
  bgStyle?: any;
  midStyle?: any;
  children?: React.ReactNode;
  height?: number;
  style?: ViewStyle;
}

export function WorshipHero({
  title,
  subtitle,
  bgStyle,
  midStyle,
  children,
  height: heroHeight = height * 0.45,
  style,
}: Props) {
  return (
    <View style={[{ height: heroHeight, overflow: 'hidden' }, style]}>
      {/* Layer 1 — background gradient with parallax */}
      <Animated.View style={[StyleSheet.absoluteFill, bgStyle]}>
        <LinearGradient
          colors={Gradients.darkWorship}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Subtle pattern overlay */}
        <View style={styles.patternOverlay} />
      </Animated.View>

      {/* Layer 2 — light beams, middle parallax */}
      <Animated.View style={[StyleSheet.absoluteFill, midStyle]}>
        <LightBeam opacity={0.1} />
      </Animated.View>

      {/* Layer 3 — foreground content */}
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(10,15,46,0.7)']}
        style={[StyleSheet.absoluteFill, styles.overlay]}
      />

      <View style={styles.content}>
        {children}
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { justifyContent: 'flex-end' },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.pagePadding,
    paddingBottom: Spacing.xl,
  },
  patternOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(45,27,105,0.3)',
  },
  title: {
    color: Colors.white,
    fontSize: FontSize.h1,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.tight,
    lineHeight: FontSize.h1 * 1.15,
  },
  subtitle: {
    color: Colors.gold,
    fontSize: FontSize.body,
    fontWeight: FontWeight.medium,
    marginTop: 4,
    letterSpacing: LetterSpacing.wide,
  },
});
