import React from 'react';
import Svg, { Defs, RadialGradient, LinearGradient, Stop, Ellipse, Path, G } from 'react-native-svg';

/**
 * HandsRaised — multiple pairs of hands lifted upward, silhouetted
 * against golden light. Different sizes represent all ages.
 *
 * Used on: giving hero, events.
 */
export interface HandsRaisedProps {
  width?: number;
  height?: number;
  glow?: string;
  hands?: string;
  style?: any;
}

// A single raised hand + forearm.
function Hand({ x, y, scale, fill }: { x: number; y: number; scale: number; fill: string }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* palm + fingers */}
      <Path
        d="M -14 40 L -14 8
           Q -14 -2 -10 -2 Q -6 -2 -6 8 L -6 2
           Q -6 -10 -2 -10 Q 2 -10 2 2 L 2 -2
           Q 2 -14 6 -14 Q 10 -14 10 -2 L 10 6
           Q 10 -4 14 -4 Q 18 -4 18 8 L 18 40 Z"
        fill={fill}
      />
    </G>
  );
}

export function HandsRaised({
  width = 400,
  height = 200,
  glow = '#F4A429',
  hands = '#150A2E',
  style,
}: HandsRaisedProps) {
  const set = [
    { x: 50, y: 150, s: 1.1 },
    { x: 110, y: 140, s: 0.85 },
    { x: 165, y: 158, s: 1.25 },
    { x: 225, y: 138, s: 0.8 },
    { x: 285, y: 150, s: 1.05 },
    { x: 345, y: 145, s: 0.9 },
  ];
  return (
    <Svg width={width} height={height} viewBox="0 0 400 200" style={style}>
      <Defs>
        <RadialGradient id="hr-glow" cx="50%" cy="20%" r="80%">
          <Stop offset="0%" stopColor={glow} stopOpacity="0.5" />
          <Stop offset="55%" stopColor={glow} stopOpacity="0.15" />
          <Stop offset="100%" stopColor={glow} stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="hr-hand" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={hands} stopOpacity="0.9" />
          <Stop offset="100%" stopColor={hands} stopOpacity="1" />
        </LinearGradient>
      </Defs>
      <Ellipse cx="200" cy="40" rx="240" ry="130" fill="url(#hr-glow)" />
      {set.map((h, i) => (
        <Hand key={i} x={h.x} y={h.y} scale={h.s} fill="url(#hr-hand)" />
      ))}
    </Svg>
  );
}

export default HandsRaised;
