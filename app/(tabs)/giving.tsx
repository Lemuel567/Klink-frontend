import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { TitheThermometer } from '../../src/components/church/TitheThermometer';
import { StatCardSkeleton } from '../../src/components/common/KlinkSkeleton';
import { KlinkButton } from '../../src/components/common/KlinkButton';
import { GlassmorphismCard } from '../../src/components/common/KlinkCard';
import { CountUp } from '../../src/components/common/CountUp';
import { HandsRaised } from '../../src/components/worship';
import { WatermarkBackground } from '../../src/components/common/WatermarkBackground';
import { ScreenPhotos } from '../../src/utils/worshipImages';
import { givingApi, Payment } from '../../src/api/giving';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useRole } from '../../src/store/authStore';
import { formatCurrency, formatDate } from '../../src/utils/formatters';

// Premium gradient tiles (same design language as giving/pay.tsx) — labels and
// subs are single-line by design; text can never wrap.
const CATEGORIES: {
  key: string;
  label: string;
  sub: string;
  gradient: readonly [string, string];
  icon: string;       // 24×24 SVG stroke path
  iconGold?: boolean;
}[] = [
  {
    key: 'TITHE', label: 'Tithe', sub: '10% of income',
    gradient: ['#2D1B69', '#6B3FA0'], iconGold: true,
    icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7v10 M9.5 9.5c0-.8 1.1-1.5 2.5-1.5s2.5.7 2.5 1.5-1.1 1.5-2.5 1.5-2.5.7-2.5 1.5 1.1 1.5 2.5 1.5 2.5-.7 2.5-1.5',
  },
  {
    key: 'OFFERING', label: 'Offering', sub: 'Free will',
    gradient: ['#854F0B', '#C67A1A'],
    icon: 'M20 12v9H4v-9 M2 7h20v5H2z M12 21V7 M12 7s-2-4-5-4-3 4 0 4h5 M12 7s2-4 5-4 3 4 0 4h-5',
  },
  {
    key: 'WELFARE', label: 'Welfare', sub: 'Help others',
    gradient: ['#085041', '#1D9E75'],
    icon: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z',
  },
  {
    key: 'SPECIAL_CONTRIBUTION', label: 'Special', sub: 'Special gift',
    gradient: ['#0C447C', '#185FA5'], iconGold: true,
    icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  },
];

const CAT_CARD_W = 100;
const CAT_CARD_GAP = 10;

export default function GivingScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const role = useRole();
  // FinSec records manual payments; everyone else pays online via Paystack
  const giveRoute = role === 'FINANCIAL_SECRETARY' ? '/giving/new' : '/giving/pay';

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
        {/* Worship photo hero — warm personal devotion (worship-solo-1) */}
        <WatermarkBackground
          imageSource={ScreenPhotos.giving}
          overlayOpacity={0.55}
          style={[styles.hero, { paddingTop: insets.top + 16 }]}
        >
          <LinearGradient
            colors={['rgba(244,164,41,0.18)', 'transparent']}
            style={StyleSheet.absoluteFill}
          />
          {/* Raised hands worship illustration behind the total */}
          <View style={styles.heroArt} pointerEvents="none">
            <HandsRaised width={360} height={160} />
          </View>
          <Text style={styles.heroLabel}>THIS MONTH</Text>
          <CountUp
            value={total}
            format={(n) => formatCurrency(n)}
            style={styles.heroAmount}
            numberOfLines={1}
          />
          <Text style={styles.heroSub}>Total contributions</Text>

          <KlinkButton
            label="Give Now"
            onPress={() => { haptics.give(); router.push(giveRoute); }}
            style={styles.giveBtn}
          />
          <TouchableOpacity
            onPress={() => { haptics.light(); router.push('/giving/payment-history'); }}
            style={styles.onlineHistoryLink}
            accessibilityRole="button"
            accessibilityLabel="View online payment history"
          >
            <Text style={styles.onlineHistoryText}>Online payments ›</Text>
          </TouchableOpacity>
        </WatermarkBackground>

        {/* Categories — premium gradient tiles, horizontal snap, one-line text */}
        <ScrollReveal delay={0}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Give to</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={CAT_CARD_W + CAT_CARD_GAP}
              decelerationRate="fast"
              contentContainerStyle={styles.categoryRow}
            >
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  activeOpacity={0.85}
                  onPress={() => { haptics.medium(); router.push(giveRoute); }}
                  accessibilityRole="button"
                  accessibilityLabel={`${cat.label}: ${cat.sub}`}
                  style={[styles.catShadow, { shadowColor: cat.gradient[0] }]}
                >
                  <LinearGradient
                    colors={cat.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.categoryCard}
                  >
                    <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
                      <Path
                        d={cat.icon}
                        stroke={cat.iconGold ? Colors.gold : Colors.white}
                        strokeWidth={1.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                    <Text style={styles.catLabel} numberOfLines={1}>{cat.label}</Text>
                    <Text style={styles.catDesc} numberOfLines={1}>{cat.sub}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
  heroArt: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    opacity: 0.5,
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
  onlineHistoryLink: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  onlineHistoryText: { color: Colors.gold, fontSize: FontSize.small, fontWeight: FontWeight.semiBold },
  section: { padding: Spacing.pagePadding, gap: Spacing.md },
  sectionTitle: { fontSize: FontSize.h4, fontWeight: FontWeight.bold },
  categoryRow: { gap: CAT_CARD_GAP, paddingRight: 15, paddingVertical: 6 },
  catShadow: {
    borderRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  categoryCard: {
    width: CAT_CARD_W,
    height: 120,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  catLabel: { fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white },
  catDesc: { fontSize: 10, color: 'rgba(255,255,255,0.75)' },
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
