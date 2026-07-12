import React from 'react';
import Svg, { Defs, RadialGradient, LinearGradient, Stop, Rect, Path, Circle, G } from 'react-native-svg';

/**
 * CrossWithRays — a bold cross with rays of light emanating outward,
 * golden on deep purple, with particle dots floating upward.
 *
 * Used on: login, prayer, check-in success.
 */
export interface CrossWithRaysProps {
  width?: number;
  height?: number;
  ray?: string;
  cross?: string;
  style?: any;
}

export function CrossWithRays({
  width = 300,
  height = 300,
  ray = '#F4A429',
  cross = '#FFD700',
  style,
}: CrossWithRaysProps) {
  // 12 light rays radiating from centre.
  const rays = Array.from({ length: 12 }, (_, i) => (i * 360) / 12);
  const particles = [
    { x: 90, y: 210, r: 3, o: 0.6 },
    { x: 210, y: 190, r: 2, o: 0.5 },
    { x: 120, y: 150, r: 2.5, o: 0.7 },
    { x: 190, y: 230, r: 2, o: 0.4 },
    { x: 150, y: 120, r: 3.5, o: 0.5 },
    { x: 105, y: 250, r: 2, o: 0.6 },
    { x: 205, y: 255, r: 2.5, o: 0.45 },
  ];
  return (
    <Svg width={width} height={height} viewBox="0 0 300 300" style={style}>
      <Defs>
        <RadialGradient id="cr-halo" cx="50%" cy="45%" r="55%">
          <Stop offset="0%" stopColor={ray} stopOpacity="0.55" />
          <Stop offset="60%" stopColor={ray} stopOpacity="0.12" />
          <Stop offset="100%" stopColor={ray} stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="cr-cross" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={cross} stopOpacity="1" />
          <Stop offset="100%" stopColor={ray} stopOpacity="1" />
        </LinearGradient>
      </Defs>

      {/* Halo */}
      <Circle cx="150" cy="135" r="150" fill="url(#cr-halo)" />

      {/* Light rays */}
      <G opacity={0.5}>
        {rays.map((deg, i) => (
          <Rect
            key={i}
            x={148.5}
            y={-20}
            width={3}
            height={150}
            fill={ray}
            opacity={i % 2 === 0 ? 0.35 : 0.18}
            transform={`rotate(${deg} 150 135)`}
          />
        ))}
      </G>

      {/* Cross */}
      <G>
        {/* vertical beam */}
        <Path d="M 141 45 h 18 v 190 h -18 Z" fill="url(#cr-cross)" />
        {/* horizontal beam */}
        <Path d="M 105 108 h 90 v 18 h -90 Z" fill="url(#cr-cross)" />
      </G>

      {/* Floating particles */}
      {particles.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={p.r} fill={cross} opacity={p.o} />
      ))}
    </Svg>
  );
}

export default CrossWithRays;
