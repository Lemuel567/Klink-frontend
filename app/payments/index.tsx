import React, { useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { PhotoHeader } from '../../src/components/common/PhotoHeader';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { CountUp } from '../../src/components/common/CountUp';
import { AnnouncementSkeleton } from '../../src/components/common/KlinkSkeleton';
import { EmptyState } from '../../src/components/common/EmptyState';
import { paymentsApi, OnlinePayment, paymentTypeLabel } from '../../src/api/payments';
import { storeApi, StorePayment } from '../../src/api/store';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { formatCurrency, formatDate } from '../../src/utils/formatters';
import { StaggerDelay } from '../../src/theme/animations';
import { TypewriterText } from '../../src/components/animations/TypewriterText';

// One unified feed of the money a member has moved THROUGH THE APP:
// online payments (tithe/offering/welfare/building/missions/special/project
// contributions) + church-store purchases. Recorded cash giving entered by the
// Financial Secretary lives under "Your giving" on Home — this page is what the
// member did in-app.

type Filter = 'all' | 'giving' | 'store';

// A merged, source-tagged transaction row.
type Tx =
  | { kind: 'online'; id: string; when: number; data: OnlinePayment }
  | { kind: 'store'; id: string; when: number; data: StorePayment };

const TYPE_COLOR: Record<string, string> = {
  TITHE: Colors.gold,
  OFFERING: Colors.purpleLight,
  WELFARE: Colors.green,
  BUILDING_FUND: Colors.roseGold,
  MISSIONS: '#C67A1A',
  PROJECT_CONTRIBUTION: Colors.blue,
  OTHER: Colors.gold,
};

const STATUS_COLOR: Record<string, string> = {
  SUCCESS: Colors.success,
  PENDING: Colors.gold,
  FAILED: Colors.red,
  ABANDONED: Colors.darkMuted,
};

export default function PaymentsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const [filter, setFilter] = useState<Filter>('all');

  const onlineQuery = useQuery({
    queryKey: ['payments-history', 'mine'],
    queryFn: () => paymentsApi.history({ size: 100 }),
  });
  const storeQuery = useQuery({
    // 'mine' suffix is load-bearing: the Store screen opens the BARE
    // ['store-my-purchases'] as an INFINITE query — sharing that key from a
    // plain useQuery poisons the persisted cache and crashes query-core
    // (the exact §15 crash class). Never drop the suffix.
    queryKey: ['store-my-purchases', 'mine'],
    queryFn: () => storeApi.myPurchases({ size: 100 }),
  });

  const isLoading = onlineQuery.isLoading || storeQuery.isLoading;
  // Either feed failing makes the TOTAL PAID headline silently wrong, so a
  // partial result is treated as a failure, not rendered as truth.
  const isError = onlineQuery.isError || storeQuery.isError;
  const isRefetching = onlineQuery.isRefetching || storeQuery.isRefetching;
  const refetch = () => {
    onlineQuery.refetch();
    storeQuery.refetch();
  };

  const online = onlineQuery.data?.content ?? [];
  const purchases = storeQuery.data?.content ?? [];

  // Total actually paid through the app = successful online payments + all store
  // purchases (a store purchase only exists once it's paid).
  const totalPaid = useMemo(() => {
    const g = online.filter((p) => p.status === 'SUCCESS').reduce((s, p) => s + p.amount, 0);
    const s = purchases.reduce((sum, p) => sum + p.amount, 0);
    return g + s;
  }, [online, purchases]);

  const transactions: Tx[] = useMemo(() => {
    const items: Tx[] = [];
    if (filter !== 'store') {
      for (const p of online) {
        items.push({
          kind: 'online',
          id: `on_${p.id}`,
          when: new Date(p.paidAt ?? p.createdAt).getTime(),
          data: p,
        });
      }
    }
    if (filter !== 'giving') {
      for (const p of purchases) {
        items.push({
          kind: 'store',
          id: `st_${p.id}`,
          when: new Date(p.datePaid).getTime(),
          data: p,
        });
      }
    }
    return items.sort((a, b) => b.when - a.when);
  }, [online, purchases, filter]);

  const setTab = (f: Filter) => { haptics.light(); setFilter(f); };

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
        <Text style={styles.eyebrow}>STEWARDSHIP</Text>
        <TypewriterText text="Payments" style={styles.headerTitle} charDelayMs={42} />
        <Text style={styles.headerSub}>Everything you've paid through the app</Text>

        <Text style={styles.totalLabel}>TOTAL PAID</Text>
        <CountUp value={totalPaid} format={(n) => formatCurrency(n)} style={styles.totalValue} numberOfLines={1} />

        <View style={styles.tabBar}>
          {(['all', 'giving', 'store'] as Filter[]).map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setTab(f)}
              style={[styles.tab, filter === f && styles.tabActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: filter === f }}
            >
              <Text style={[styles.tabText, filter === f && styles.tabTextActive]}>
                {f === 'all' ? 'All' : f === 'giving' ? 'Giving' : 'Store'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </PhotoHeader>

      {isLoading ? (
        <View style={{ paddingTop: Spacing.md }}>
          {Array.from({ length: 6 }, (_, i) => <AnnouncementSkeleton key={i} />)}
        </View>
      ) : isError ? (
        <EmptyState
          icon="⚠️"
          title="Couldn't load your payments"
          subtitle="Check your connection and try again."
          actionLabel="Try again"
          onAction={refetch}
        />
      ) : (
        <FlashList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <ScrollReveal delay={Math.min(index, 8) * StaggerDelay.list} style={styles.rowWrap}>
              {item.kind === 'online' ? (
                <OnlineRow payment={item.data} theme={theme} />
              ) : (
                <StoreRow purchase={item.data} theme={theme} />
              )}
            </ScrollReveal>
          )}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.gold} />}
          contentContainerStyle={{ paddingTop: Spacing.md, paddingBottom: 100 }}
          ListEmptyComponent={
            <EmptyState
              icon="💳"
              title="No payments yet"
              subtitle={
                filter === 'store'
                  ? 'Your church-store purchases will appear here.'
                  : filter === 'giving'
                    ? 'Your online giving will appear here.'
                    : 'Give online or buy from the church store and it will show up here.'
              }
              actionLabel={filter !== 'store' ? 'Give now' : undefined}
              onAction={filter !== 'store' ? () => router.push('/giving/pay') : undefined}
            />
          }
        />
      )}
    </View>
  );
}

function OnlineRow({ payment, theme }: { payment: OnlinePayment; theme: any }) {
  const color = TYPE_COLOR[payment.paymentType] ?? Colors.gold;
  const statusColor = STATUS_COLOR[payment.status] ?? Colors.darkMuted;
  return (
    <View style={[styles.row, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <View style={[styles.dot, { backgroundColor: `${color}22` }]}>
        <View style={[styles.dotInner, { backgroundColor: color }]} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
          {paymentTypeLabel(payment.paymentType)}
        </Text>
        <Text style={[styles.rowMeta, { color: theme.textMuted }]} numberOfLines={1}>
          {formatDate(payment.paidAt ?? payment.createdAt)}
          {payment.channel ? ` · ${payment.channel}` : ''}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.rowAmount, { color: theme.text }]}>{formatCurrency(payment.amount)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}22` }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{payment.status}</Text>
        </View>
      </View>
    </View>
  );
}

function StoreRow({ purchase, theme }: { purchase: StorePayment; theme: any }) {
  const collected = purchase.collectionStatus === 'COLLECTED';
  const statusColor = collected ? Colors.success : Colors.gold;
  return (
    <View style={[styles.row, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <View style={[styles.dot, { backgroundColor: 'rgba(157,111,212,0.15)' }]}>
        <Text style={styles.dotEmoji}>🛍</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
          {purchase.itemName ?? 'Store purchase'}
        </Text>
        <Text style={[styles.rowMeta, { color: theme.textMuted }]} numberOfLines={1}>
          {formatDate(purchase.datePaid)} · Store
        </Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.rowAmount, { color: theme.text }]}>{formatCurrency(purchase.amount)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}22` }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {collected ? 'COLLECTED' : 'TO COLLECT'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.pagePadding, paddingBottom: Spacing.lg, gap: 2 },
  backBtn: { alignSelf: 'flex-start', width: 44, height: 44, justifyContent: 'center' },
  backIcon: { color: Colors.white, fontSize: 32, lineHeight: 34 },
  eyebrow: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: FontWeight.semiBold,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  headerTitle: { color: Colors.white, fontSize: FontSize.h2, fontWeight: FontWeight.bold, letterSpacing: LetterSpacing.tight },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.small },
  totalLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semiBold,
    letterSpacing: LetterSpacing.wider,
    marginTop: Spacing.md,
  },
  totalValue: { color: Colors.gold, fontSize: 34, fontWeight: FontWeight.bold, letterSpacing: LetterSpacing.tight },
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
  rowWrap: { marginHorizontal: Spacing.pagePadding, marginBottom: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  dot: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  dotInner: { width: 12, height: 12, borderRadius: 6 },
  dotEmoji: { fontSize: 18 },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontSize: FontSize.body, fontWeight: FontWeight.semiBold, textTransform: 'capitalize' },
  rowMeta: { fontSize: FontSize.caption },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  rowAmount: { fontSize: FontSize.body, fontWeight: FontWeight.bold },
  statusBadge: { borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 0.5 },
});
