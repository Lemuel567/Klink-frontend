import React from 'react';
import { ImageSourcePropType, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { RotatingBackground } from './RotatingBackground';

interface Props {
  /**
   * Kept for API compatibility — since the 2026-07-12 "login-page look
   * everywhere" overhaul this component always renders the ROTATING worship
   * photo set (all screens share the same cinematic crossfading background).
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

/**
 * Full-bleed rotating worship-photo background with a graduated overlay —
 * the login-page treatment, shared by every screen that uses this component.
 */
export function WatermarkBackground({
  children,
  overlayOpacity = 0.6,
  overlayColor = '#0A0520',
  style,
}: Props) {
  const top = rgba(overlayColor, overlayOpacity * 0.5);
  const mid = rgba(overlayColor, Math.min(0.9, overlayOpacity * 1.08));
  const bottom = rgba(overlayColor, Math.min(0.95, overlayOpacity * 1.45));

  return (
    <RotatingBackground
      overlayColors={[top, mid, bottom] as const}
      style={[styles.container, style]}
    >
      {children}
    </RotatingBackground>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden', position: 'relative' },
});
