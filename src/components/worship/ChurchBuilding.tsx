import React from 'react';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect, Path, Circle, G } from 'react-native-svg';

/**
 * ChurchBuilding — a modern church with a steeple and stained-glass
 * windows glowing from inside, under a starry night sky.
 *
 * Used on: home hero, church profile, projects hero.
 */
export interface ChurchBuildingProps {
  width?: number;
  height?: number;
  wall?: string;
  glass?: string;
  sky?: string;
  style?: any;
}

export function ChurchBuilding({
  width = 320,
  height = 260,
  wall = '#1A0F3E',
  glass = '#F4A429',
  sky = '#2D1B69',
  style,
}: ChurchBuildingProps) {
  const stars = [
    { x: 30, y: 30 }, { x: 70, y: 55 }, { x: 120, y: 22 }, { x: 200, y: 40 },
    { x: 260, y: 28 }, { x: 290, y: 60 }, { x: 160, y: 48 }, { x: 240, y: 70 },
  ];
  return (
    <Svg width={width} height={height} viewBox="0 0 320 260" style={style}>
      <Defs>
        <LinearGradient id="cb-sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#0A0F2E" />
          <Stop offset="100%" stopColor={sky} />
        </LinearGradient>
        <RadialGradient id="cb-glow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={glass} stopOpacity="0.9" />
          <Stop offset="100%" stopColor={glass} stopOpacity="0.35" />
        </RadialGradient>
        <LinearGradient id="cb-wall" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={wall} stopOpacity="1" />
          <Stop offset="100%" stopColor="#0A0722" stopOpacity="1" />
        </LinearGradient>
      </Defs>

      {/* sky */}
      <Rect x="0" y="0" width="320" height="260" fill="url(#cb-sky)" rx="0" />
      {stars.map((s, i) => (
        <Circle key={i} cx={s.x} cy={s.y} r={i % 3 === 0 ? 2 : 1.3} fill="#FFF4D6" opacity={0.85} />
      ))}

      {/* steeple */}
      <Path d="M 150 40 L 172 95 L 128 95 Z" fill="url(#cb-wall)" />
      {/* cross on steeple */}
      <Rect x="147" y="18" width="6" height="24" fill={glass} rx="2" />
      <Rect x="141" y="24" width="18" height="6" fill={glass} rx="2" />

      {/* main body */}
      <Rect x="70" y="95" width="180" height="140" fill="url(#cb-wall)" rx="6" />

      {/* arched doorway */}
      <Path d="M 140 235 L 140 175 Q 160 155 180 175 L 180 235 Z" fill="url(#cb-glow)" />

      {/* round rose window */}
      <Circle cx="160" cy="128" r="16" fill="url(#cb-glow)" />

      {/* side stained-glass windows */}
      <G>
        <Path d="M 95 200 L 95 160 Q 105 148 115 160 L 115 200 Z" fill="url(#cb-glow)" opacity={0.95} />
        <Path d="M 205 200 L 205 160 Q 215 148 225 160 L 225 200 Z" fill="url(#cb-glow)" opacity={0.95} />
      </G>
    </Svg>
  );
}

export default ChurchBuilding;
