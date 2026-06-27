import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

interface Props {
  opacity?: number;
  style?: ViewStyle;
}

export function NoiseTexture({ opacity = 0.04, style }: Props) {
  const dots = Array.from({ length: 200 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: Math.random() * 2 + 0.5,
    op: Math.random() * 0.6 + 0.2,
  }));

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        { opacity, overflow: 'hidden', pointerEvents: 'none' },
        style,
      ]}
    >
      {dots.map((dot) => (
        <View
          key={dot.id}
          style={{
            position: 'absolute',
            left: dot.left as any,
            top: dot.top as any,
            width: dot.size,
            height: dot.size,
            borderRadius: dot.size / 2,
            backgroundColor: 'white',
            opacity: dot.op,
          }}
        />
      ))}
    </View>
  );
}
