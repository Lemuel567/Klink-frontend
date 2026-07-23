import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { PopPressable } from '../../src/components/common/PopPressable';
import { TitheThermometer } from '../../src/components/church/TitheThermometer';
import { StatCardSkeleton } from '../../src/components/common/KlinkSkeleton';
import { KlinkButton } from '../../src/components/common/KlinkButton';
import { GlassmorphismCard } from '../../src/components/common/KlinkCard';
import { CountUp } from '../../src/components/common/CountUp';
import { HandsRaised } from '../../src/components/worship';
import { WatermarkBackground } from '../../src/components/common/WatermarkBackground';
import { ScreenPhotos, WorshipImages } from '../../src/utils/worshipImages';
import { givingApi, Payment } from '../../src/api/giving';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontFamily, FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
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

// Real worship photo behind each category card (dark scrim keeps text crisp)
const CAT_PHOTOS: Record<string, any> = {
  TITHE: WorshipImages.worshipSolo1,
  OFFERING: WorshipImages.congregation1,
  WELFARE: WorshipImages.prayer1,
  SPECIAL_CONTRIBUTION: WorshipImages.worshipHands4,
};

const CAT_CARD_W = 150;
const CAT_CARD_GAP = 10;

export default function GivingScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const role = useRole();
  // EVERYONE (including the Financial Secretary) gives personally via Paystack.
  // The FinSec's church-recording duty is a SEPARATE button below — previously
  // it hijacked their "Give Now", leaving them no way to make personal payments.
  const isFinSec = role === 'FINANCIAL_SECRETARY';

  const { data: myPayments, isLoading, refetch, isRefetching } =
    useQuery({ queryKey: ['myPayments'], queryFn: () => givingApi.getMyPayments({ size: 100 }) });

  // "THIS MONTH" must mean this month — the old sum of the last 10 payments
  // showed an all-time-ish figure under a monthly label.
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const total =
    myPayments?.content
      ?.filter(
        (p: Payment) =>
          p.paymentMonth === currentMonth || (p.paymentDate ?? '').startsWith(currentMonth),
      )
      .reduce((sum: number, p: Payment) => sum + (p.amount as number), 0) ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.gold} />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Worship photo hero — DISTINCT static photo (warm personal devotion),
            not the global rotation, so Give has its own visual identity.
            (WatermarkBackground ignores imageSource since the dark-only overhaul —
            it just showed the same rotation as every other screen.) */}
        <View style={[styles.hero, { paddingTop: insets.top + 16, overflow: 'hidden' }]}>
          <Image
            source={ScreenPhotos.giving}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={300}
          />
          <LinearGradient
            colors={['rgba(10,5,32,0.3)', 'rgba(10,5,32,0.55)', 'rgba(10,5,32,0.9)']}
            style={StyleSheet.absoluteFill}
          />
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
            onPress={() => { haptics.give(); router.push('/giving/pay'); }}
            style={styles.giveBtn}
          />
          {isFinSec && (
            <KlinkButton
              label="Record Member Payment"
              variant="secondary"
              onPress={() => { haptics.medium(); router.push('/giving/new'); }}
              style={styles.giveBtn}
            />
          )}
          <TouchableOpacity
            onPress={() => { haptics.light(); router.push('/giving/payment-history'); }}
            style={styles.onlineHistoryLink}
            accessibilityRole="button"
            accessibilityLabel="View online payment history"
          >
            <Text style={styles.onlineHistoryText}>Online payments ›</Text>
          </TouchableOpacity>
          {(role === 'FINANCIAL_SECRETARY' || role === 'PASTOR' || role === 'ELDER') && (
            <TouchableOpacity
              onPress={() => { haptics.light(); router.push('/finances/collections' as any); }}
              style={styles.onlineHistoryLink}
              accessibilityRole="button"
              accessibilityLabel="View service collections summary"
            >
              <Text style={styles.onlineHistoryText}>Service collections ›</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Automatic giving — prominent photo card (was a buried hero text link
            nobody found). Routes to the recurring-giving manager. */}
        <ScrollReveal delay={0}>
          <View style={styles.section}>
            <TouchableOpacity
              onPress={() => { haptics.medium(); router.push('/giving/recurring' as any); }}
              style={styles.recurringCard}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Set up automatic giving"
            >
              <Image
                source={WorshipImages.congregation1}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
              <LinearGradient
                colors={['rgba(10,5,32,0.4)', 'rgba(10,5,32,0.75)', 'rgba(10,5,32,0.93)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.recurringBody}>
                <Text style={styles.recurringEyebrow}>NEW · SET & FORGET</Text>
                <Text style={styles.recurringTitle}>Automatic giving</Text>
                <Text style={styles.recurringDesc} numberOfLines={2}>
                  Pick an amount and a day of the month — Klink reminds you, ready to give in one tap.
                </Text>
              </View>
              <Text style={styles.recurringChevron}>›</Text>
            </TouchableOpacity>
          </View>
        </ScrollReveal>

        {/* Categories — premium gradient tiles, horizontal snap, one-line text */}
        <ScrollReveal delay={60}>
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
                <PopPressable
                  key={cat.key}
                  onPress={() => { haptics.medium(); router.push('/giving/pay'); }}
                  accessibilityRole="button"
                  accessibilityLabel={`${cat.label}: ${cat.sub}`}
                  style={[styles.catShadow, { shadowColor: cat.gradient[0] }]}
                  flashRadius={20}
                >
                  <View style={[styles.categoryCard, { overflow: 'hidden' }]}>
                    <Image
                      source={CAT_PHOTOS[cat.key]}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                    <LinearGradient
                      colors={['rgba(10,5,32,0.15)', 'rgba(10,5,32,0.5)', 'rgba(10,5,32,0.88)']}
                      style={StyleSheet.absoluteFill}
                    />
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
                  </View>
                </PopPressable>
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
            myPayments?.content?.slice(0, 10).map((payment: Payment, i: number) => (
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
  recurringCard: {
    flexDirection: 'row', alignItems: 'center', minHeight: 104,
    borderRadius: BorderRadius.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(244,164,41,0.35)',
    borderTopColor: 'rgba(255,255,255,0.28)',
  },
  recurringBody: { flex: 1, padding: Spacing.md, gap: 3 },
  recurringEyebrow: { color: Colors.gold, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.8 },
  recurringTitle: { color: Colors.white, fontSize: FontSize.h4, fontWeight: FontWeight.bold },
  recurringDesc: { color: 'rgba(255,255,255,0.78)', fontSize: FontSize.caption, lineHeight: FontSize.caption * 1.5 },
  recurringChevron: { color: Colors.gold, fontSize: 30, paddingHorizontal: Spacing.md },
  section: { padding: Spacing.pagePadding, gap: Spacing.md },
  // Serif display voice for section titles (matches home; no fontWeight with a
  // weight-specific named family — Android font-resolution quirk)
  sectionTitle: { fontFamily: FontFamily.displayBold, fontSize: FontSize.h4 },
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
    height: 156,
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
