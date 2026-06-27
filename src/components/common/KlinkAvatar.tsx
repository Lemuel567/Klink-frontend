import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Colors, Gradients } from '../../theme/colors';
import { FontSize, FontWeight } from '../../theme/typography';
import { getInitials } from '../../utils/formatters';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  name: string;
  photoUrl?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function KlinkAvatar({ name, photoUrl, size = 48, style }: Props) {
  const initials = getInitials(name);
  const fontSize = size * 0.36;
  const borderRadius = size / 2;

  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={[{ width: size, height: size, borderRadius }, style as any]}
        contentFit="cover"
        placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
        transition={300}
        accessibilityLabel={name}
      />
    );
  }

  return (
    <LinearGradient
      colors={Gradients.worship}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ width: size, height: size, borderRadius }, styles.fallback, style]}
    >
      <Text style={[styles.initials, { fontSize, fontWeight: FontWeight.semiBold }]}>
        {initials}
      </Text>
    </LinearGradient>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const config = getRoleConfig(role);
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

function getRoleConfig(role: string) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    PASTOR: { label: 'Pastor', bg: 'rgba(244,164,41,0.2)', color: Colors.gold },
    ELDER: { label: 'Elder', bg: 'rgba(201,121,122,0.2)', color: Colors.roseGold },
    MANAGER: { label: 'Manager', bg: 'rgba(74,144,217,0.2)', color: Colors.blue },
    FINANCIAL_SECRETARY: { label: 'Fin. Sec.', bg: 'rgba(45,106,79,0.2)', color: Colors.green },
    GROUP_ADMIN: { label: 'Group Admin', bg: 'rgba(107,63,160,0.2)', color: Colors.purpleLight },
    GROUP_FINANCIAL_SECRETARY: { label: 'Group FinSec', bg: 'rgba(45,106,79,0.15)', color: Colors.green },
    MEMBER: { label: 'Member', bg: 'rgba(139,143,168,0.2)', color: Colors.darkMuted },
  };
  return map[role] ?? { label: role, bg: 'rgba(139,143,168,0.2)', color: Colors.darkMuted };
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: Colors.white,
    letterSpacing: 0.5,
  },
  badge: {
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semiBold,
    letterSpacing: 0.3,
  },
});
