import React from 'react';
import { ImageSourcePropType, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  /**
   * Kept for API compatibility — since the 2026-07-12 "login-page look
   * everywhere" overhaul the photos come from the ONE global
   * RotatingBackground in app/_layout.tsx, visible through every screen's
   * transparent container. This prop is ignored.
   */
  imageSource?: ImageSourcePropType;
  children?: React.ReactNode;
  /** Overall overlay strength (0.4–0.7): lighter at top, darkest at bottom. */
  overlayOpacity?: number;
  /** Overlay tint — deep night purple by default. */
  overlayColor?: string;
  style?: StyleProp<ViewStyle>;
}

function rgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${Math.min(1, Math.max(0, alpha))})`;
}

// The GLOBAL RotatingBackground (app/_layout.tsx) already darkens the photos
// with these stops. This component sits ON TOP of that, so its veil must only
// add the DIFFERENCE needed to reach the intended total darkness — stacking
// the full veil on the global one buried the photos in near-black (the
// "background picture is gone on app open" bug, 2026-07-23).
const GLOBAL_UNDERLAY = [0.45, 0.6, 0.75];

/** alpha `w` such that global ⊕ w == the intended standalone darkness */
function compensate(target: number, underlay: number): number {
  if (target <= underlay) return 0;
  return (target - underlay) / (1 - underlay);
}

/**
 * Graduated dark veil over the app-wide rotating worship background.
 *
 * PERFORMANCE (2026-07-23): this used to render its OWN RotatingBackground —
 * a second full-screen photo crossfade + Ken Burns loop stacked on top of the
 * global one, doubling steady GPU/CPU work on every screen that used it. The
 * global rotation in _layout.tsx already shows through the transparent screen
 * container, so all this component adds is the (underlay-compensated) scrim.
 * Same API, same look — half the background work.
 */
export function WatermarkBackground({
  children,
  overlayOpacity = 0.6,
  overlayColor = '#0A0520',
  style,
}: Props) {
  // Intended TOTAL darkness (what the old standalone component produced)…
  const targets = [
    overlayOpacity * 0.5,
    Math.min(0.9, overlayOpacity * 1.08),
    Math.min(0.95, overlayOpacity * 1.45),
  ];
  // …minus what the global background already contributes.
  const [top, mid, bottom] = targets.map((t, i) =>
    rgba(overlayColor, compensate(t, GLOBAL_UNDERLAY[i])),
  );

  return (
    <View style={[styles.container, style]}>
      <LinearGradient colors={[top, mid, bottom] as const} style={StyleSheet.absoluteFill} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden', position: 'relative' },
});
