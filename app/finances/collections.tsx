import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PhotoHeader } from '../../src/components/common/PhotoHeader';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { CountUp } from '../../src/components/common/CountUp';
import { StatCardSkeleton } from '../../src/components/common/KlinkSkeleton';
import { EmptyState } from '../../src/components/common/EmptyState';
import { givingApi, CollectionsLine } from '../../src/api/giving';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useRole } from '../../src/store/authStore';
import { formatCurrency } from '../../src/utils/formatters';
import { TypewriterText } from '../../src/components/animations/TypewriterText';

// FinSec / Pastor / Elder — reconcile what came in for a church service.
const ALLOWED = ['FINANCIAL_SECRETARY', 'PASTOR', 'ELDER'];

const TYPE_LABEL: Record<string, string> = {
  OFFERING: 'Offering',
  TITHE: 'Tithe',
  WELFARE: 'Welfare',
  SPECIAL_CONTRIBUTION: 'Special',
};

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function prettyDate(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d} ${months[(m ?? 1) - 1]} ${y}`;
}

export default function CollectionsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const role = useRole();
  const allowed = role ? ALLOWED.includes(role) : false;

  const today = iso(new Date());
  const [mode, setMode] = useState<'day' | 'month'>('day');
  const [serviceDate, setServiceDate] = useState(today);

  // Compute the query range from the current mode
  const now = new Date();
  const monthFrom = iso(new Date(now.getFullYear(), now.getMonth(), 1));
  const monthTo = iso(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const from = mode === 'day' ? serviceDate : monthFrom;
  const to = mode === 'day' ? serviceDate : monthTo;
  const validDay = /^\d{4}-\d{2}-\d{2}$/.test(from);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['finance-summary', from, to],
    queryFn: () => givingApi.getCollectionsSummary({ from, to }),
    enabled: allowed && validDay,
  });

  if (!allowed) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <PhotoHeader style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <TypewriterText text="Collections" style={styles.headerTitle} charDelayMs={42} />
        </PhotoHeader>
        <EmptyState icon="🔒" title="Finance team only" subtitle="Only the Financial Secretary, Pastor, or Elder can view collections." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <PhotoHeader style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.eyebrow}>STEWARDSHIP</Text>
        <TypewriterText text="Service Collections" style={styles.headerTitle} charDelayMs={42} />
        <Text style={styles.headerSub}>Cash you recorded + gifts taken through the app</Text>

        {/* Mode toggle */}
        <View style={styles.tabBar}>
          {(['day', 'month'] as const).map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => { haptics.light(); setMode(m); }}
              style={[styles.tab, mode === m && styles.tabActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === m }}
            >
              <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>
                {m === 'day' ? 'A service day' : 'This month'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {mode === 'day' && (
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>SERVICE DATE</Text>
            <TextInput
              value={serviceDate}
              onChangeText={setServiceDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="rgba(255,255,255,0.4)"
              style={styles.dateInput}
              autoCapitalize="none"
              selectionColor={Colors.gold}
            />
          </View>
        )}
      </PhotoHeader>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.gold} />}
        contentContainerStyle={{ padding: Spacing.pagePadding, paddingBottom: 80, gap: Spacing.md }}
      >
        {!validDay ? (
          <EmptyState
            icon="🗓"
            title="Enter a service date"
            subtitle="Type the date as YYYY-MM-DD to see that day's collections."
          />
        ) : isLoading ? (
          <StatCardSkeleton />
        ) : isError || !data ? (
          <EmptyState
            icon="⚠️"
            title="Couldn't load collections"
            subtitle="Check your connection and try again."
            actionLabel="Try again"
            onAction={refetch}
          />
        ) : (
          <>
            {/* Grand total */}
            <ScrollReveal delay={0}>
              <View style={[styles.totalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <Text style={[styles.totalCaption, { color: theme.textMuted }]}>
                  TOTAL COLLECTED · {mode === 'day' ? prettyDate(from) : `${prettyDate(from)} – ${prettyDate(to)}`}
                </Text>
                <CountUp value={data.grandTotal} format={(n) => formatCurrency(n)} style={styles.totalValue} numberOfLines={1} />
                <View style={styles.splitRow}>
                  <View style={styles.splitPill}>
                    <Text style={[styles.splitLabel, { color: theme.textMuted }]}>Recorded by hand</Text>
                    <Text style={[styles.splitValue, { color: theme.text }]}>{formatCurrency(data.manualTotal)}</Text>
                  </View>
                  <View style={styles.splitPill}>
                    <Text style={[styles.splitLabel, { color: theme.textMuted }]}>Through the app</Text>
                    <Text style={[styles.splitValue, { color: Colors.gold }]}>{formatCurrency(data.onlineTotal)}</Text>
                  </View>
                </View>
              </View>
            </ScrollReveal>

            {/* Per-type lines */}
            {data.lines.map((line: CollectionsLine, i: number) => (
              <ScrollReveal key={line.type} delay={60 + i * 50}>
                <View style={[styles.lineCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                  <View style={styles.lineTop}>
                    <Text style={[styles.lineType, { color: theme.text }]}>{TYPE_LABEL[line.type] ?? line.type}</Text>
                    <Text style={[styles.lineTotal, { color: theme.text }]}>{formatCurrency(line.total)}</Text>
                  </View>
                  <View style={styles.lineSplit}>
                    <Text style={[styles.lineSplitText, { color: theme.textMuted }]}>
                      Hand {formatCurrency(line.manual)}
                    </Text>
                    <Text style={[styles.lineSplitText, { color: Colors.gold }]}>
                      App {formatCurrency(line.online)}
                    </Text>
                  </View>
                </View>
              </ScrollReveal>
            ))}

            {/* Explain + record cash offering */}
            <ScrollReveal delay={300}>
              <Text style={[styles.note, { color: theme.textMuted }]}>
                “Through the app” is counted automatically from online payments. “Recorded by hand” is what a
                secretary entered — like the counted cash offering. For offerings you usually enter one lump sum
                per service; tithe and welfare are per member.
              </Text>
            </ScrollReveal>

            {role === 'FINANCIAL_SECRETARY' && (
              <ScrollReveal delay={340}>
                <TouchableOpacity
                  onPress={() => { haptics.medium(); router.push('/giving/new'); }}
                  style={styles.recordBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Record a cash payment"
                >
                  <LinearGradient colors={Gradients.glory} style={styles.recordGradient}>
                    <Text style={styles.recordText}>Record a cash payment</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollReveal>
            )}
          </>
        )}
      </ScrollView>
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
    flexDirection: 'row',
    marginTop: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: BorderRadius.full,
    padding: 3,
    alignSelf: 'flex-start',
  },
  tab: { paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: BorderRadius.full, minHeight: 44, justifyContent: 'center' },
  tabActive: { backgroundColor: Colors.gold },
  tabText: { color: 'rgba(255,255,255,0.75)', fontSize: FontSize.caption, fontWeight: FontWeight.semiBold },
  tabTextActive: { color: '#1A0533' },
  dateRow: { marginTop: Spacing.md, gap: 4 },
  dateLabel: { color: 'rgba(255,255,255,0.55)', fontSize: FontSize.caption, fontWeight: FontWeight.semiBold, letterSpacing: LetterSpacing.wider },
  dateInput: {
    borderWidth: 1,
    borderColor: 'rgba(244,164,41,0.4)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    color: Colors.white,
    fontSize: FontSize.body,
    alignSelf: 'flex-start',
    minWidth: 180,
  },
  totalCard: { borderRadius: BorderRadius.xl, borderWidth: 1, padding: Spacing.lg, gap: Spacing.sm },
  totalCaption: { fontSize: FontSize.caption, fontWeight: FontWeight.semiBold, letterSpacing: LetterSpacing.wide },
  totalValue: { color: Colors.gold, fontSize: 40, fontWeight: FontWeight.bold, letterSpacing: LetterSpacing.tight },
  splitRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  splitPill: { flex: 1, gap: 2 },
  splitLabel: { fontSize: FontSize.caption },
  splitValue: { fontSize: FontSize.body, fontWeight: FontWeight.semiBold },
  lineCard: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.md, gap: 6 },
  lineTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lineType: { fontSize: FontSize.body, fontWeight: FontWeight.semiBold },
  lineTotal: { fontSize: FontSize.body, fontWeight: FontWeight.bold },
  lineSplit: { flexDirection: 'row', gap: Spacing.md },
  lineSplitText: { fontSize: FontSize.caption },
  note: { fontSize: FontSize.small, lineHeight: FontSize.small * 1.6 },
  recordBtn: { borderRadius: BorderRadius.full, overflow: 'hidden', marginTop: Spacing.xs },
  recordGradient: { paddingVertical: 15, alignItems: 'center', borderRadius: BorderRadius.full },
  recordText: { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.body },
});
