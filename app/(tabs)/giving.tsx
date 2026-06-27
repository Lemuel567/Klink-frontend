import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { TitheThermometer } from '../../src/components/church/TitheThermometer';
import { StatCardSkeleton } from '../../src/components/common/KlinkSkeleton';
import { KlinkButton } from '../../src/components/common/KlinkButton';
import { GlassmorphismCard } from '../../src/components/common/KlinkCard';
import { givingApi, Payment } from '../../src/api/giving';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { formatCurrency, formatDate } from '../../src/utils/formatters';

const CATEGORIES = [
  { key: 'TITHE', label: 'Tithe', color: Colors.gold, desc: 'Ten percent of your income' },
  { key: 'OFFERING', label: 'Offering', color: Colors.purple, desc: 'Give as led by the Spirit' },
  { key: 'WELFARE', label: 'Welfare', color: Colors.green, desc: 'Support those in need' },
  { key: 'SPECIAL_CONTRIBUTION', label: 'Special', color: Colors.blue, desc: 'Designated campaigns' },
];

export default function GivingScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();

  const { data: myPayments, isLoading, refetch, isRefetching } =
    useQuery({ queryKey: ['myPayments'], queryFn: () => givingApi.getMyPayments({ size: 10 }) });

  const total = myPayments?.content?.reduce((sum: number, p: Payment) => sum + (p.amount as number), 0) ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.gold} />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Aurora hero */}
        <LinearGradient
          colors={Gradients.darkWorship}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 16 }]}
        >
          <LinearGradient
            colors={['rgba(244,164,41,0.2)', 'transparent']}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.heroLabel}>THIS MONTH</Text>
          <Text style={styles.heroAmount}>{formatCurrency(total)}</Text>
          <Text style={styles.heroSub}>Total contributions</Text>

          <KlinkButton
            label="Give Now"
            onPress={() => { haptics.give(); router.push('/giving/new'); }}
            style={styles.giveBtn}
          />
        </LinearGradient>

        {/* Categories */}
        <ScrollReveal delay={0}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Give to</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat, i) => (
                <ScrollReveal key={cat.key} delay={i * 60}>
                  <TouchableOpacity
                    onPress={() => { haptics.medium(); router.push('/giving/new'); }}
                    style={[styles.categoryCard, { borderColor: `${cat.color}40` }]}
                    accessibilityRole="button"
                    accessibilityLabel={cat.label}
                  >
                    <View style={[styles.catDot, { backgroundColor: `${cat.color}30` }]}>
                      <View style={[styles.catDotInner, { backgroundColor: cat.color }]} />
                    </View>
                    <Text style={[styles.catLabel, { color: theme.text }]}>{cat.label}</Text>
                    <Text style={[styles.catDesc, { color: theme.textMuted }]}>{cat.desc}</Text>
                  </TouchableOpacity>
                </ScrollReveal>
              ))}
            </View>
          </View>
        </ScrollReveal>

        {/* Monthly goal thermometer */}
        <ScrollReveal delay={200}>
          <GlassmorphismCard style={styles.thermoCard}>
            <Text style={[styles.sectionTitle, { color: Colors.white }]}>Monthly Tithe Goal</Text>
            <TitheThermometer
              raised={total}
              target={2000}
              currency="GHS"
              label="GHS 2,000 goal"
            />
          </GlassmorphismCard>
        </ScrollReveal>

        {/* Giving history */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Giving history</Text>
          {isLoading ? (
            <StatCardSkeleton />
          ) : myPayments?.content?.length === 0 ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                No giving records yet. Start your journey today.
              </Text>
            </View>
          ) : (
            myPayments?.content?.map((payment: Payment, i: number) => (
              <PaymentRow key={payment.id} payment={payment} index={i} />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function PaymentRow({ payment, index }: { payment: Payment; index: number }) {
  const { theme } = useTheme();
  const typeColors: Record<string, string> = {
    TITHE: Colors.gold,
    OFFERING: Colors.purple,
    WELFARE: Colors.green,
    DUES: Colors.blue,
    SPECIAL_CONTRIBUTION: Colors.roseGold,
  };
  const color = typeColors[payment.paymentType] ?? Colors.darkMuted;

  return (
    <ScrollReveal delay={index * 60} style={styles.paymentRow}>
      <View style={[styles.paymentDot, { backgroundColor: `${color}25` }]}>
        <View style={[styles.paymentDotInner, { backgroundColor: color }]} />
      </View>
      <View style={styles.paymentInfo}>
        <Text style={[styles.paymentType, { color: theme.text }]}>
          {payment.paymentType.replace('_', ' ')}
        </Text>
        <Text style={[styles.paymentDate, { color: theme.textMuted }]}>
          {formatDate(payment.paymentDate)}
        </Text>
      </View>
      <Text style={[styles.paymentAmount, { color }]}>
        {formatCurrency(payment.amount)}
      </Text>
    </ScrollReveal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    padding: Spacing.pagePadding,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  heroLabel: {
    color: Colors.gold,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.widest,
  },
  heroAmount: {
    color: Colors.white,
    fontSize: 48,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.tightest,
  },
  heroSub: { color: 'rgba(255,255,255,0.5)', fontSize: FontSize.small, marginBottom: Spacing.md },
  giveBtn: { width: 200 },
  section: { padding: Spacing.pagePadding, gap: Spacing.md },
  sectionTitle: { fontSize: FontSize.h4, fontWeight: FontWeight.bold },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  categoryCard: {
    width: '47.5%',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    minHeight: 44,
  },
  catDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  catDotInner: { width: 12, height: 12, borderRadius: 6 },
  catLabel: { fontSize: FontSize.body, fontWeight: FontWeight.semiBold },
  catDesc: { fontSize: FontSize.caption },
  thermoCard: {
    marginHorizontal: Spacing.pagePadding,
    gap: Spacing.md,
    borderRadius: BorderRadius.xxl,
  },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyText: { fontSize: FontSize.body, textAlign: 'center', lineHeight: FontSize.body * 1.6 },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  paymentDot: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  paymentDotInner: { width: 12, height: 12, borderRadius: 6 },
  paymentInfo: { flex: 1 },
  paymentType: { fontSize: FontSize.body, fontWeight: FontWeight.medium, textTransform: 'capitalize' },
  paymentDate: { fontSize: FontSize.caption, marginTop: 2 },
  paymentAmount: { fontSize: FontSize.body, fontWeight: FontWeight.bold },
});
