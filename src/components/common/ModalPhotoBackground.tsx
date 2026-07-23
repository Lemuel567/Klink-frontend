import React from 'react';
import { ImageSourcePropType, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { RotatingBackground } from './RotatingBackground';

interface Props {
  /** Kept for API compatibility with the old WatermarkBackground. Ignored. */
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
 * ModalPhotoBackground — the rotating worship photos + graduated veil for
 * MODAL screens (edit profile, Paystack pay, record payment, new prayer).
 *
 * Modals present in their own native layer ABOVE the app, so the global
 * RotatingBackground in _layout is NOT visible behind them — unlike regular
 * screens, a modal must carry its own photos. The veil here is therefore the
 * FULL strength (not the underlay-compensated one WatermarkBackground uses).
 *
 * Perf note: while a modal is open it covers the screen, so running its own
 * rotation is not doubling anything the user can see; it unmounts on close.
 */
export function ModalPhotoBackground({
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

export default ModalPhotoBackground;
