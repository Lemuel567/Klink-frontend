import React, { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * WorshipScene — the standard layered hero treatment:
 *   Layer 1: worship gradient background
 *   Layer 2: SVG worship illustration (passed as `illustration`)
 *   Layer 3: readability scrim + foreground children (text, actions)
 *
 * Keeps every hero on-brand and consistent per the Klink skill's
 * "photo and motion blend" layering rules.
 */
export interface WorshipSceneProps {
  children?: ReactNode;
  illustration?: ReactNode;
  /** Two-stop gradient colours for the background layer. */
  gradient?: readonly [string, string, ...string[]];
  /** Horizontal alignment of the illustration layer. */
  illustrationAlign?: 'center' | 'flex-end' | 'flex-start';
  height?: number;
  style?: StyleProp<ViewStyle>;
  /** Dark scrim at the bottom to guarantee text contrast. */
  scrim?: boolean;
}

export function WorshipScene({
  children,
  illustration,
  gradient = ['#0A0F2E', '#2D1B69'],
  illustrationAlign = 'center',
  height,
  style,
  scrim = true,
}: WorshipSceneProps) {
  return (
    <View style={[styles.container, height ? { height } : null, style]}>
      {/* Layer 1 — gradient */}
      <LinearGradient
        colors={gradient}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Layer 2 — illustration */}
      {illustration ? (
        <View style={[styles.illustration, { justifyContent: illustrationAlign }]} pointerEvents="none">
          {illustration}
        </View>
      ) : null}

      {/* Warm worship tint (skill: rgba(244,164,41,0.2) overlay) */}
      <View style={styles.warmTint} pointerEvents="none" />

      {/* Readability scrim */}
      {scrim ? (
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(10,15,46,0.85)']}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}

      {/* Layer 3 — foreground */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative', overflow: 'hidden' },
  illustration: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  warmTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(244,164,41,0.12)',
  },
  content: { flex: 1, justifyContent: 'flex-end' },
});

export default WorshipScene;
