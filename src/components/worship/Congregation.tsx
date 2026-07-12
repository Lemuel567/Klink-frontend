import React from 'react';
import Svg, { Defs, RadialGradient, LinearGradient, Stop, Ellipse, Path, Circle, G } from 'react-native-svg';

/**
 * Congregation — a crowd of worshippers with hands raised toward heaven,
 * silhouetted against a warm golden backlight.
 *
 * Used on: home hero, splash, onboarding screen 1.
 * Dark-mode aware via the `glow` / `silhouette` props.
 */
export interface CongregationProps {
  width?: number;
  height?: number;
  /** Colour of the divine backlight behind the crowd. */
  glow?: string;
  /** Colour of the worshipper silhouettes. */
  silhouette?: string;
  style?: any;
}

// A single worshipper: head + torso + two arms raised in a V toward heaven.
function Worshipper({ x, scale, fill }: { x: number; scale: number; fill: string }) {
  const s = scale;
  return (
    <G transform={`translate(${x}, ${200 - 70 * s}) scale(${s})`}>
      {/* head */}
      <Circle cx={0} cy={0} r={9} fill={fill} />
      {/* torso */}
      <Path d="M -11 14 Q 0 8 11 14 L 9 70 L -9 70 Z" fill={fill} />
      {/* left arm raised */}
      <Path d="M -9 16 Q -22 2 -19 -18 L -14 -18 Q -13 4 -3 18 Z" fill={fill} />
      {/* right arm raised */}
      <Path d="M 9 16 Q 22 2 19 -18 L 14 -18 Q 13 4 3 18 Z" fill={fill} />
    </G>
  );
}

export function Congregation({
  width = 400,
  height = 220,
  glow = '#F4A429',
  silhouette = '#150A2E',
  style,
}: CongregationProps) {
  // Rows of worshippers, back rows smaller and dimmer for depth.
  const back = [30, 90, 150, 210, 270, 330];
  const front = [10, 70, 130, 190, 250, 310, 370];
  return (
    <Svg width={width} height={height} viewBox="0 0 400 220" style={style}>
      <Defs>
        <RadialGradient id="cg-glow" cx="50%" cy="30%" r="70%">
          <Stop offset="0%" stopColor={glow} stopOpacity="0.55" />
          <Stop offset="45%" stopColor={glow} stopOpacity="0.18" />
          <Stop offset="100%" stopColor={glow} stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="cg-fig" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={silhouette} stopOpacity="0.92" />
          <Stop offset="100%" stopColor={silhouette} stopOpacity="1" />
        </LinearGradient>
      </Defs>

      {/* Divine backlight */}
      <Ellipse cx="200" cy="70" rx="230" ry="150" fill="url(#cg-glow)" />

      {/* Back row — smaller, pushed up, lighter for atmospheric depth */}
      <G opacity={0.45}>
        {back.map((x, i) => (
          <Worshipper key={`b${i}`} x={x} scale={0.72} fill="url(#cg-fig)" />
        ))}
      </G>

      {/* Front row — full size, grounded at the base */}
      <G>
        {front.map((x, i) => (
          <Worshipper key={`f${i}`} x={x} scale={1} fill="url(#cg-fig)" />
        ))}
      </G>
    </Svg>
  );
}

export default Congregation;
