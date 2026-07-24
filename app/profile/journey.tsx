import React, { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { PhotoHeader } from '../../src/components/common/PhotoHeader';
import { KlinkAvatar } from '../../src/components/common/KlinkAvatar';
import { CountUp } from '../../src/components/common/CountUp';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { StatCardSkeleton } from '../../src/components/common/KlinkSkeleton';
import { EmptyState } from '../../src/components/common/EmptyState';
import { TypewriterText } from '../../src/components/animations/TypewriterText';
import { membersApi } from '../../src/api/members';
import { givingApi } from '../../src/api/giving';
import { churchApi } from '../../src/api/church';
import { shareGivingStatement } from '../../src/utils/givingStatement';
import { Colors } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { formatCurrency, formatDate } from '../../src/utils/formatters';

// "3 years, 2 months with us" style caption from the join date.
function timeWithUs(since?: string | null): string | null {
  if (!since) return null;
  const start = new Date(since);
  if (isNaN(start.getTime())) return null;
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 1) return 'New this month';
  const years = Math.floor(months / 12);
  const rem = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? 'year' : 'years'}`);
  if (rem > 0) parts.push(`${rem} ${rem === 1 ? 'month' : 'months'}`);
  return `${parts.join(', ')} with us`;
}

export default function JourneyScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const [downloading, setDownloading] = useState(false);
  const currentYear = new Date().getFullYear();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['my-journey'],
    queryFn: () => membersApi.getMyJourney(),
  });

  const { data: church } = useQuery({
    queryKey: ['church-settings'],
    queryFn: () => churchApi.getSettings(),
  });

  // #2 Year-end giving statement — fetched on demand, rendered to a PDF, shared.
  const downloadStatement = async () => {
    if (!data || downloading) return;
    setDownloading(true);
    haptics.medium();
    try {
      const page = await givingApi.getMyPayments({ size: 300 });
      await shareGivingStatement({
        memberName: data.fullName,
        churchName: church?.churchName ?? 'Your Church',
        year: currentYear,
        payments: page.content,
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <PhotoHeader style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.eyebrow}>YOUR IMPACT</Text>
        <TypewriterText text="Your Journey" style={styles.headerTitle} charDelayMs={42} />
        {data && (
          <View style={styles.heroRow}>
            <KlinkAvatar name={data.fullName} photoUrl={data.photoUrl ?? undefined} size={56} />
            <View style={{ flex: 1 }}>
              <Text style={styles.heroName} numberOfLines={1}>{data.fullName}</Text>
              <Text style={styles.heroSub}>
                {timeWithUs(data.memberSince) ??
                  (data.memberSince ? `Member since ${formatDate(data.memberSince)}` : 'Welcome')}
              </Text>
            </View>
          </View>
        )}
      </PhotoHeader>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.gold} />}
        contentContainerStyle={{ padding: Spacing.pagePadding, paddingBottom: insets.bottom + 40, gap: Spacing.md }}
      >
        {isLoading ? (
          <StatCardSkeleton />
        ) : isError || !data ? (
          <EmptyState
            icon="⚠️"
            title="Couldn't load your journey"
            subtitle="Check your connection and try again."
            actionLabel="Try again"
            onAction={refetch}
          />
        ) : (
          <>
            {/* Total given — the hero number */}
            <ScrollReveal delay={0}>
              <View style={styles.bannerCard}>
                <Text style={styles.bannerLabel}>TOTAL GIVEN TO THE CHURCH</Text>
                <CountUp
                  value={data.totalGiven}
                  from={0}
                  format={(n) => formatCurrency(n)}
                  style={styles.bannerValue}
                  numberOfLines={1}
                />
                <Text style={styles.bannerSub}>
                  {formatCurrency(data.givenThisYear)} of that this year
                </Text>
                {data.givingStreakMonths >= 2 && (
                  <View style={styles.streakPill}>
                    <Text style={styles.streakText}>
                      🔥 {data.givingStreakMonths}-month giving streak
                    </Text>
                  </View>
                )}
              </View>
            </ScrollReveal>

            {/* #2 Year-end giving statement (PDF) */}
            <ScrollReveal delay={40}>
              <TouchableOpacity
                onPress={downloadStatement}
                disabled={downloading}
                style={styles.stmtBtn}
                accessibilityRole="button"
                accessibilityLabel={`Download your ${currentYear} giving statement`}
              >
                <LinearGradient
                  colors={['rgba(244,164,41,0.2)', 'rgba(107,63,160,0.28)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.stmtInner}
                >
                  {downloading ? (
                    <>
                      <ActivityIndicator size="small" color={Colors.gold} />
                      <Text style={styles.stmtText}>Preparing your statement…</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.stmtIcon}>📄</Text>
                      <Text style={styles.stmtText}>Download my {currentYear} giving statement</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollReveal>

            {/* #1 Milestones — celebratory faithfulness badges */}
            {data.milestones.length > 0 && (
              <ScrollReveal delay={80}>
                <View style={[styles.milestonesCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                  <Text style={styles.milestonesLabel}>✨ YOUR MILESTONES</Text>
                  <View style={styles.badgeWrap}>
                    {data.milestones.map((m) => (
                      <View key={m.label} style={styles.badge}>
                        <Text style={styles.badgeIcon}>{m.icon}</Text>
                        <Text style={styles.badgeLabel}>{m.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </ScrollReveal>
            )}

            {/* Achievement grid */}
            <ScrollReveal delay={80}>
              <View style={styles.grid}>
                <StatTile
                  icon="⛪"
                  value={String(data.servicesAttended)}
                  label="Services attended"
                  theme={theme}
                />
                <StatTile
                  icon="🏗️"
                  value={String(data.projectsSupported)}
                  label="Projects supported"
                  sub={data.projectContributed > 0 ? formatCurrency(data.projectContributed) : undefined}
                  theme={theme}
                />
                <StatTile
                  icon="🤝"
                  value={`${data.pledgesKept}/${data.pledgesTotal}`}
                  label="Pledges kept"
                  sub={data.pledgedAmount > 0
                    ? `${formatCurrency(data.pledgePaidAmount)} of ${formatCurrency(data.pledgedAmount)}`
                    : undefined}
                  theme={theme}
                />
                {data.welfareApplicable && (
                  <StatTile
                    icon={data.welfareUpToDate ? '✅' : '⏳'}
                    value={data.welfareUpToDate ? 'Up to date' : 'Due'}
                    valueColor={data.welfareUpToDate ? Colors.success : Colors.roseGold}
                    label="Welfare (this month)"
                    theme={theme}
                  />
                )}
              </View>
            </ScrollReveal>

            {/* Groups */}
            {data.groups.length > 0 && (
              <ScrollReveal delay={140}>
                <View style={[styles.groupsCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                  <Text style={styles.groupsLabel}>👥 YOU'RE PART OF</Text>
                  <View style={styles.chips}>
                    {data.groups.map((g) => (
                      <View key={g} style={styles.chip}>
                        <Text style={styles.chipText}>{g}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </ScrollReveal>
            )}

            <Text style={[styles.footer, { color: theme.textMuted }]}>
              This is your own summary — private to you. Thank you for all you pour into the church. 💛
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function StatTile({
  icon, value, label, sub, valueColor, theme,
}: { icon: string; value: string; label: string; sub?: string; valueColor?: string; theme: any }) {
  return (
    <View style={[styles.statTile, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color: valueColor ?? theme.text }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textMuted }]} numberOfLines={2}>{label}</Text>
      {sub && <Text style={[styles.statSub, { color: theme.textMuted }]} numberOfLines={1}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.pagePadding, paddingBottom: Spacing.lg, gap: 2 },
  backBtn: { alignSelf: 'flex-start', width: 44, height: 44, justifyContent: 'center' },
  backIcon: { color: Colors.white, fontSize: 32, lineHeight: 34 },
  eyebrow: {
    color: Colors.gold, fontSize: 11, fontWeight: FontWeight.semiBold,
    letterSpacing: 2.2, textTransform: 'uppercase',
  },
  headerTitle: {
    color: Colors.white, fontSize: FontSize.h2, fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.tight,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.md },
  heroName: { color: Colors.white, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  heroSub: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.small, marginTop: 2 },
  bannerCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(244,164,41,0.4)',
    borderTopColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(244,164,41,0.12)',
    padding: Spacing.lg,
    gap: 4,
  },
  bannerLabel: {
    color: Colors.gold, fontSize: FontSize.caption, fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.wider,
  },
  bannerValue: { color: Colors.white, fontSize: FontSize.h1, fontWeight: FontWeight.bold },
  bannerSub: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.small },
  streakPill: {
    alignSelf: 'flex-start', marginTop: Spacing.sm,
    backgroundColor: 'rgba(10,5,32,0.35)', borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(244,164,41,0.5)',
  },
  streakText: { color: Colors.gold, fontSize: FontSize.small, fontWeight: FontWeight.bold },
  stmtBtn: {
    borderRadius: BorderRadius.full, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(244,164,41,0.45)',
  },
  stmtInner: {
    minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingHorizontal: Spacing.md,
  },
  stmtIcon: { fontSize: 16 },
  stmtText: { color: Colors.gold, fontSize: FontSize.small, fontWeight: FontWeight.bold, letterSpacing: 0.3 },
  milestonesCard: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.md, gap: Spacing.sm },
  milestonesLabel: {
    color: Colors.gold, fontSize: FontSize.caption, fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.wide,
  },
  badgeWrap: { gap: Spacing.sm },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: 'rgba(244,164,41,0.08)', borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: 'rgba(244,164,41,0.25)',
    paddingHorizontal: Spacing.md, paddingVertical: 10,
  },
  badgeIcon: { fontSize: 20 },
  badgeLabel: { flex: 1, color: '#F5F0FF', fontSize: FontSize.small, fontWeight: FontWeight.semiBold },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statTile: {
    width: '48%', flexGrow: 1, borderRadius: BorderRadius.lg, borderWidth: 1,
    padding: Spacing.md, gap: 4,
  },
  statIcon: { fontSize: 22 },
  statValue: { fontSize: FontSize.h3, fontWeight: FontWeight.bold },
  statLabel: { fontSize: FontSize.caption, fontWeight: FontWeight.medium },
  statSub: { fontSize: FontSize.caption },
  groupsCard: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.md, gap: Spacing.sm },
  groupsLabel: {
    color: Colors.gold, fontSize: FontSize.caption, fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.wide,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    borderWidth: 1, borderColor: 'rgba(244,164,41,0.35)', backgroundColor: 'rgba(244,164,41,0.1)',
    borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: 7,
  },
  chipText: { color: Colors.gold, fontSize: FontSize.caption, fontWeight: FontWeight.semiBold },
  footer: {
    fontSize: FontSize.small, textAlign: 'center', lineHeight: FontSize.small * 1.6,
    marginTop: Spacing.md, paddingHorizontal: Spacing.md,
  },
});
