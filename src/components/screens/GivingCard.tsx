import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollReveal } from '../animations/ScrollReveal';
import { Colors } from '../../theme/colors';
import { FontSize, FontWeight } from '../../theme/typography';
import { BorderRadius, Spacing } from '../../theme/spacing';
import { StaggerDelay } from '../../theme/animations';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useHaptics } from '../../hooks/useHaptics';

interface GivingCardProps {
  type: string;
  amount: number;
  date: string;
  status: 'CONFIRMED' | 'PENDING';
  index?: number;
  onPress?: () => void;
}

const TYPE_COLORS: Record<string, string[]> = {
  TITHE: [Colors.gold, '#c97f10'],
  OFFERING: [Colors.purple, Colors.purpleMid],
  WELFARE: ['#22c55e', '#15803d'],
  DUES: ['#3b82f6', '#1d4ed8'],
  SPECIAL_CONTRIBUTION: [Colors.roseGold, '#9a6b5a'],
};

export function GivingCard({ type, amount, date, status, index = 0, onPress }: GivingCardProps) {
  const haptics = useHaptics();
  const [from, to] = TYPE_COLORS[type] ?? [Colors.darkMuted, Colors.darkMuted];

  return (
    <ScrollReveal replayOnFocus={false} delay={index * StaggerDelay.fast} style={styles.wrap}>
      <TouchableOpacity
        onPress={() => { haptics.light(); onPress?.(); }}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`${type} giving record: ${formatCurrency(amount)}`}
      >
        <View style={styles.card}>
          <LinearGradient colors={[from, to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconBox}>
            <Text style={styles.icon}>✦</Text>
          </LinearGradient>
          <View style={styles.info}>
            <Text style={styles.type}>{type.replace('_', ' ')}</Text>
            <Text style={styles.date}>{formatDate(date)}</Text>
          </View>
          <View style={styles.right}>
            <Text style={[styles.amount, { color: from }]}>{formatCurrency(amount)}</Text>
            <View style={[styles.badge, { backgroundColor: status === 'CONFIRMED' ? 'rgba(34,197,94,0.15)' : 'rgba(244,164,41,0.15)' }]}>
              <Text style={[styles.badgeText, { color: status === 'CONFIRMED' ? '#22c55e' : Colors.gold }]}>
                {status}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </ScrollReveal>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: Spacing.pagePadding, marginBottom: Spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    minHeight: 44,
  },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  icon: { color: Colors.white, fontSize: 18 },
  info: { flex: 1, gap: 3 },
  type: { color: Colors.white, fontSize: FontSize.body, fontWeight: FontWeight.medium, textTransform: 'capitalize' },
  date: { color: Colors.darkMuted, fontSize: FontSize.caption },
  right: { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: FontSize.body, fontWeight: FontWeight.bold },
  badge: { borderRadius: BorderRadius.full, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontSize: FontSize.micro, fontWeight: FontWeight.semiBold },
});
