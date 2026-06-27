import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Colors } from '../../theme/colors';
import { FontSize, FontWeight } from '../../theme/typography';
import { BorderRadius } from '../../theme/spacing';

type Variant = 'primary' | 'gold' | 'success' | 'warning' | 'danger' | 'ghost';

const VARIANT_STYLES: Record<Variant, { bg: string; text: string }> = {
  primary: { bg: 'rgba(45,27,105,0.9)', text: Colors.white },
  gold: { bg: 'rgba(244,164,41,0.15)', text: Colors.gold },
  success: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
  warning: { bg: 'rgba(244,164,41,0.15)', text: Colors.gold },
  danger: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
  ghost: { bg: 'rgba(255,255,255,0.08)', text: Colors.darkMuted },
};

interface Props {
  label: string;
  variant?: Variant;
  style?: ViewStyle;
  size?: 'sm' | 'md';
}

export function KlinkBadge({ label, variant = 'primary', style, size = 'md' }: Props) {
  const { bg, text } = VARIANT_STYLES[variant];
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg, paddingHorizontal: isSmall ? 6 : 10, paddingVertical: isSmall ? 2 : 4 },
        style,
      ]}
    >
      <Text style={[styles.label, { color: text, fontSize: isSmall ? FontSize.micro : FontSize.caption }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  label: {
    fontWeight: FontWeight.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
