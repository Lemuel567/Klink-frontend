import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

// Shared header photo (tt.jpg). Drop-in replacement for a plain-gradient page
// header: renders the photo full-bleed behind a graduated dark scrim (light at
// top → dark at the bottom) so white titles and back buttons stay readable.
const HEADER_IMAGE = require('../../../assets/images/tt.jpg');

interface Props extends ViewProps {
  /** Scrim gradient over the photo. Default keeps text legible on any header. */
  scrim?: readonly [string, string, ...string[]];
}

export function PhotoHeader({
  style,
  children,
  scrim = ['rgba(10,5,32,0.35)', 'rgba(10,5,32,0.7)', 'rgba(10,5,32,0.94)'] as const,
  ...rest
}: Props) {
  return (
    <View style={[styles.wrap, style]} {...rest}>
      <Image
        source={HEADER_IMAGE}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={200}
      />
      <LinearGradient colors={scrim} style={StyleSheet.absoluteFill} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', position: 'relative' },
});
