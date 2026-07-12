import React from 'react';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Path, Rect, Line, G } from 'react-native-svg';

/**
 * OpenBible — an open Bible with golden pages and light rays
 * emanating from between the pages.
 *
 * Used on: sermons hero, devotional screen, daily verse.
 */
export interface OpenBibleProps {
  width?: number;
  height?: number;
  page?: string;
  cover?: string;
  ray?: string;
  style?: any;
}

export function OpenBible({
  width = 300,
  height = 220,
  page = '#FDF8F0',
  cover = '#4A2580',
  ray = '#F4A429',
  style,
}: OpenBibleProps) {
  const rays = [-40, -22, -8, 8, 22, 40];
  return (
    <Svg width={width} height={height} viewBox="0 0 300 220" style={style}>
      <Defs>
        <RadialGradient id="ob-glow" cx="50%" cy="35%" r="60%">
          <Stop offset="0%" stopColor={ray} stopOpacity="0.6" />
          <Stop offset="100%" stopColor={ray} stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="ob-page" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="100%" stopColor={page} />
        </LinearGradient>
        <LinearGradient id="ob-cover" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={cover} />
          <Stop offset="100%" stopColor="#2D1B69" />
        </LinearGradient>
      </Defs>

      {/* light rays from the spine */}
      <G opacity={0.55}>
        {rays.map((deg, i) => (
          <Rect
            key={i}
            x={148}
            y={-30}
            width={4}
            height={140}
            fill={ray}
            opacity={0.3}
            transform={`rotate(${deg} 150 110)`}
          />
        ))}
      </G>
      <Path d="M 150 60 m -120 0 a 120 120 0 0 1 240 0 Z" fill="url(#ob-glow)" opacity={0.5} />

      {/* cover */}
      <Path d="M 40 150 Q 150 130 260 150 L 260 168 Q 150 148 40 168 Z" fill="url(#ob-cover)" />

      {/* left page */}
      <Path d="M 150 150 Q 96 132 44 148 L 50 92 Q 100 78 150 96 Z" fill="url(#ob-page)" />
      {/* right page */}
      <Path d="M 150 150 Q 204 132 256 148 L 250 92 Q 200 78 150 96 Z" fill="url(#ob-page)" />

      {/* text lines */}
      <G stroke="#C9B896" strokeWidth={1.4} opacity={0.7}>
        <Line x1="66" y1="104" x2="132" y2="112" />
        <Line x1="64" y1="114" x2="132" y2="121" />
        <Line x1="62" y1="124" x2="132" y2="130" />
        <Line x1="168" y1="112" x2="234" y2="104" />
        <Line x1="168" y1="121" x2="236" y2="114" />
        <Line x1="168" y1="130" x2="238" y2="124" />
      </G>
      {/* spine ribbon */}
      <Rect x="148" y="96" width="4" height="56" fill={ray} opacity={0.8} rx="2" />
    </Svg>
  );
}

export default OpenBible;
