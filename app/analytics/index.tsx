import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { PhotoHeader } from '../../src/components/common/PhotoHeader';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { StatCardSkeleton } from '../../src/components/common/KlinkSkeleton';
import { EmptyState } from '../../src/components/common/EmptyState';
import { CountUp } from '../../src/components/common/CountUp';
import { analyticsApi } from '../../src/api/analytics';
import { Colors } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useRole } from '../../src/store/authStore';
import { formatCurrency } from '../../src/utils/formatters';
import { TypewriterText } from '../../src/components/animations/TypewriterText';

const ALLOWED = ['PASTOR', 'ELDER'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthLabel(ym: string) {
  const m = Number(ym.split('-')[1]);
  return MONTHS[(m || 1) - 1];
}
function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}
function growthText(pct: number) {
  const arrow = pct > 0 ? '▲' : pct < 0 ? '▼' : '–';
  return `${arrow} ${Math.abs(pct).toFixed(1)}%`;
}
function growthColor(pct: number) {
  return pct > 0 ? Colors.success : pct < 0 ? Colors.red : Colors.darkMuted;
}

export default function AnalyticsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const role = useRole();
  const allowed = role ? ALLOWED.includes(role) : false;
  const [months, setMonths] = useState(6);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['analytics-dashboard', months],
    queryFn: () => analyticsApi.getDashboard(months),
    enabled: allowed,
  });

  if (!allowed) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <PhotoHeader style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <TypewriterText text="Insights" style={styles.headerTitle} charDelayMs={42} />
        </PhotoHeader>
        <EmptyState icon="🔒" title="Leadership only" subtitle="Only the Pastor or an Elder can view church insights." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <PhotoHeader style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.eyebrow}>LEADERSHIP</Text>
        <TypewriterText text="Insights" style={styles.headerTitle} charDelayMs={42} />
        <Text style={styles.headerSub}>How your church is growing</Text>

        <View style={styles.tabBar}>
          {[6, 12].map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => { haptics.light(); setMonths(m); }}
              style={[styles.tab, months === m && styles.tabActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: months === m }}
            >
              <Text style={[styles.tabText, months === m && styles.tabTextActive]}>{m} months</Text>
            </TouchableOpacity>
          ))}
        </View>
      </PhotoHeader>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.gold} />}
        contentContainerStyle={{ padding: Spacing.pagePadding, paddingBottom: 80, gap: Spacing.md }}
      >
        {isLoading ? (
          <StatCardSkeleton />
        ) : isError || !data ? (
          <EmptyState
            icon="⚠️"
            title="Couldn't load insights"
            subtitle="Check your connection and try again."
            actionLabel="Try again"
            onAction={refetch}
          />
        ) : (
          <>
            {/* Headline stats */}
            <ScrollReveal delay={0}>
              <View style={styles.statGrid}>
                <StatTile
                  label="Attendance"
                  value={data.thisMonthAttendance}
                  sub="this month"
                  growthPct={data.attendanceGrowthPct}
                  theme={theme}
                />
                <StatTile
                  label="Giving"
                  value={data.thisMonthGiving}
                  format={formatCurrency}
                  sub="this month"
                  growthPct={data.givingGrowthPct}
                  theme={theme}
                />
                <StatTile label="Active members" value={data.activeMembers} sub={`${data.totalMembers} total`} theme={theme} />
                <StatTile label="New members" value={data.newMembersThisMonth} sub="this month" theme={theme} />
              </View>
            </ScrollReveal>

            {/* Charts */}
            <ScrollReveal delay={80}>
              <ChartCard title="ATTENDANCE" subtitle="Members present each month" theme={theme}>
                <BarChart labels={data.months} values={data.attendance} color={Colors.blue} />
              </ChartCard>
            </ScrollReveal>

            <ScrollReveal delay={140}>
              <ChartCard title="GIVING" subtitle="Total collected each month" theme={theme}>
                <BarChart labels={data.months} values={data.giving} color={Colors.gold} format={compact} />
              </ChartCard>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <ChartCard title="NEW MEMBERS" subtitle="Members who joined each month" theme={theme}>
                <BarChart labels={data.months} values={data.newMembers} color={Colors.green} />
              </ChartCard>
            </ScrollReveal>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function StatTile({
  label, value, format, sub, growthPct, theme,
}: { label: string; value: number; format?: (n: number) => string; sub: string; growthPct?: number; theme: any }) {
  return (
    <View style={[styles.statTile, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <Text style={[styles.statLabel, { color: theme.textMuted }]}>{label}</Text>
      <CountUp
        value={value}
        from={0}
        format={format}
        style={[styles.statValue, { color: theme.text }]}
        numberOfLines={1}
      />
      <View style={styles.statBottom}>
        <Text style={[styles.statSub, { color: theme.textMuted }]}>{sub}</Text>
        {growthPct !== undefined && (
          <Text style={[styles.statGrowth, { color: growthColor(growthPct) }]}>{growthText(growthPct)}</Text>
        )}
      </View>
    </View>
  );
}

function ChartCard({
  title, subtitle, theme, children,
}: { title: string; subtitle: string; theme: any; children: React.ReactNode }) {
  return (
    <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <Text style={[styles.chartTitle, { color: Colors.gold }]}>{title}</Text>
      <Text style={[styles.chartSubtitle, { color: theme.textMuted }]}>{subtitle}</Text>
      {children}
    </View>
  );
}

// Bars rise from the baseline with a small left-to-right stagger when the chart
// appears (and re-run when the 6/12-month window changes). Height animation is
// fine here: the row has a fixed height, so no layout shift, and a chart has at
// most 12 one-shot tweens. Gated by the system reduce-motion setting.
function AnimatedBar({
  height, color, dim, delay,
}: { height: number; color: string; dim: boolean; delay: number }) {
  const reduced = useReducedMotion();
  const h = useSharedValue(reduced ? height : 3);
  useEffect(() => {
    h.value = reduced
      ? height
      : withDelay(delay, withTiming(height, { duration: 650, easing: Easing.bezier(0.16, 1, 0.3, 1) }));
  }, [height, reduced, delay, h]);
  const animatedStyle = useAnimatedStyle(() => ({ height: h.value }));
  return (
    <Animated.View
      style={[styles.chartBar, { backgroundColor: color, opacity: dim ? 0.45 : 1 }, animatedStyle]}
    />
  );
}

// Simple bar chart with plain views — bars scale to the tallest month; the last
// (current) month is highlighted in full colour, earlier months are dimmed.
function BarChart({
  labels, values, color, format,
}: { labels: string[]; values: number[]; color: string; format?: (n: number) => string }) {
  const max = Math.max(1, ...values);
  const lastIndex = values.length - 1;
  return (
    <View style={styles.chartRow}>
      {values.map((v, i) => {
        const h = Math.max(3, Math.round((v / max) * 120));
        const isCurrent = i === lastIndex;
        return (
          <View key={labels[i]} style={styles.chartCol}>
            <Text style={styles.chartBarValue} numberOfLines={1}>{format ? format(v) : v}</Text>
            <AnimatedBar height={h} color={color} dim={!isCurrent} delay={i * 45} />
            <Text style={styles.chartBarLabel}>{monthLabel(labels[i])}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.pagePadding, paddingBottom: Spacing.lg, gap: 2 },
  backBtn: { alignSelf: 'flex-start', width: 44, height: 44, justifyContent: 'center' },
  backIcon: { color: Colors.white, fontSize: 32, lineHeight: 34 },
  eyebrow: { color: Colors.gold, fontSize: 11, fontWeight: FontWeight.semiBold, letterSpacing: 2.2, textTransform: 'uppercase' },
  headerTitle: { color: Colors.white, fontSize: FontSize.h2, fontWeight: FontWeight.bold, letterSpacing: LetterSpacing.tight },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.small },
  tabBar: {
    flexDirection: 'row', marginTop: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: BorderRadius.full, padding: 3, alignSelf: 'flex-start',
  },
  tab: { paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: BorderRadius.full, minHeight: 44, justifyContent: 'center' },
  tabActive: { backgroundColor: Colors.gold },
  tabText: { color: 'rgba(255,255,255,0.75)', fontSize: FontSize.caption, fontWeight: FontWeight.semiBold },
  tabTextActive: { color: '#1A0533' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statTile: { width: '48%', flexGrow: 1, borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.md, gap: 4 },
  statLabel: { fontSize: FontSize.caption, fontWeight: FontWeight.semiBold, letterSpacing: 0.5 },
  statValue: { fontSize: FontSize.h3, fontWeight: FontWeight.bold },
  statBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statSub: { fontSize: FontSize.caption },
  statGrowth: { fontSize: FontSize.caption, fontWeight: FontWeight.bold },
  chartCard: { borderRadius: BorderRadius.xl, borderWidth: 1, padding: Spacing.md, gap: 4 },
  chartTitle: { fontSize: FontSize.caption, fontWeight: FontWeight.bold, letterSpacing: LetterSpacing.wider },
  chartSubtitle: { fontSize: FontSize.caption, marginBottom: Spacing.sm },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', height: 165, gap: 4, marginTop: Spacing.xs },
  chartCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  chartBarValue: { color: 'rgba(245,240,255,0.7)', fontSize: 9, fontWeight: FontWeight.semiBold },
  chartBar: { width: '62%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  chartBarLabel: { color: 'rgba(245,240,255,0.55)', fontSize: 9, fontWeight: FontWeight.medium },
});
