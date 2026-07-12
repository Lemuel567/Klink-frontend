import React from 'react';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Path, Ellipse, G } from 'react-native-svg';

/**
 * DoveInFlight — a graceful dove, wings spread wide, soaring upward
 * with a soft light trail behind it.
 *
 * Used on: splash animation, prayer submission success.
 */
export interface DoveInFlightProps {
  width?: number;
  height?: number;
  body?: string;
  trail?: string;
  style?: any;
}

export function DoveInFlight({
  width = 260,
  height = 200,
  body = '#FFFFFF',
  trail = '#F4A429',
  style,
}: DoveInFlightProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 260 200" style={style}>
      <Defs>
        <RadialGradient id="dv-glow" cx="60%" cy="45%" r="55%">
          <Stop offset="0%" stopColor={body} stopOpacity="0.4" />
          <Stop offset="100%" stopColor={body} stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="dv-trail" x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0%" stopColor={trail} stopOpacity="0" />
          <Stop offset="100%" stopColor={trail} stopOpacity="0.6" />
        </LinearGradient>
        <LinearGradient id="dv-body" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={body} stopOpacity="1" />
          <Stop offset="100%" stopColor={body} stopOpacity="0.85" />
        </LinearGradient>
      </Defs>

      {/* soft aura */}
      <Ellipse cx="150" cy="90" rx="110" ry="80" fill="url(#dv-glow)" />

      {/* light trail */}
      <Path d="M 20 170 Q 90 150 130 100 L 150 110 Q 100 160 32 182 Z" fill="url(#dv-trail)" />

      {/* dove */}
      <G>
        {/* upper wing spread wide */}
        <Path d="M 150 95 Q 120 40 60 30 Q 105 60 118 92 Q 90 78 70 82 Q 110 95 150 95 Z" fill="url(#dv-body)" />
        {/* lower wing */}
        <Path d="M 150 95 Q 135 130 90 150 Q 130 128 138 100 Z" fill="url(#dv-body)" opacity={0.9} />
        {/* body + head */}
        <Path d="M 150 95 Q 178 78 205 82 Q 214 82 214 90 Q 206 96 198 94 Q 200 104 190 108 Q 168 110 150 100 Z" fill="url(#dv-body)" />
        {/* tail */}
        <Path d="M 150 98 Q 168 112 172 132 L 160 128 L 156 138 L 150 122 Z" fill="url(#dv-body)" opacity={0.85} />
      </G>
    </Svg>
  );
}

export default DoveInFlight;
