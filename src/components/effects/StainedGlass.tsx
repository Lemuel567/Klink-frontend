import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Polygon, Defs, RadialGradient, Stop } from 'react-native-svg';

interface Props {
  width?: number;
  height?: number;
  style?: ViewStyle;
  opacity?: number;
}

const PANELS = [
  { points: '0,0 120,0 80,100 0,80', color: 'rgba(45,27,105,0.3)' },
  { points: '120,0 240,0 240,60 160,100', color: 'rgba(244,164,41,0.2)' },
  { points: '0,80 80,100 60,200 0,180', color: 'rgba(74,37,128,0.25)' },
  { points: '80,100 160,100 140,200 60,200', color: 'rgba(244,164,41,0.15)' },
  { points: '160,100 240,60 240,200 140,200', color: 'rgba(45,27,105,0.2)' },
  { points: '0,180 60,200 40,300 0,280', color: 'rgba(100,60,180,0.2)' },
  { points: '60,200 140,200 120,300 40,300', color: 'rgba(244,164,41,0.1)' },
  { points: '140,200 240,200 240,300 120,300', color: 'rgba(45,27,105,0.25)' },
];

export function StainedGlass({ width = 240, height = 300, style, opacity = 0.4 }: Props) {
  const scaleX = width / 240;
  const scaleY = height / 300;

  return (
    <View style={[{ width, height, overflow: 'hidden' }, style]}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill} opacity={opacity}>
        {PANELS.map((panel, i) => (
          <Polygon
            key={i}
            points={panel.points
              .split(' ')
              .map((pt) => {
                const [x, y] = pt.split(',').map(Number);
                return `${x * scaleX},${y * scaleY}`;
              })
              .join(' ')}
            fill={panel.color}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="0.5"
          />
        ))}
      </Svg>
    </View>
  );
}
