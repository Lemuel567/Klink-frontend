import React from 'react';
import { RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { KlinkCard } from '../../src/components/common/KlinkCard';
import { AnnouncementSkeleton } from '../../src/components/common/KlinkSkeleton';
import { EmptyState } from '../../src/components/common/EmptyState';
import { CountUp } from '../../src/components/common/CountUp';
import { HandsRaised } from '../../src/components/worship';
import {
  paymentsApi,
  OnlinePayment,
  OnlinePaymentStatus,
  paymentTypeLabel,
} from '../../src/api/payments';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useRole } from '../../src/store/authStore';
import { formatRelativeTime } from '../../src/utils/formatters';
import { PAGE_SIZE } from '../../src/utils/constants';

const PRIVILEGED = ['PASTOR', 'ELDER', 'MANAGER', 'FINANCIAL_SECRETARY'];

function statusColor(status: OnlinePaymentStatus): string {
  switch (status) {
    case 'SUCCESS':   return Colors.success;
    case 'PENDING':   return Colors.gold;
    case 'FAILED':    return Colors.red;
    case 'ABANDONED': return Colors.darkMuted;
  }
}

export default function PaymentHistoryScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const role = useRole();

  const isPrivileged = role ? PRIVILEGED.includes(role) : false;

  const query = useInfiniteQuery({
    queryKey: ['payments-history'],
    queryFn: ({ pageParam = 0 }) => paymentsApi.history({ page: pageParam, size: PAGE_SIZE }),
    getNextPageParam: (last) => (last.number + 1 < last.totalPages ? last.number + 1 : undefined),
    initialPageParam: 0,
  });

  const { data: summary } = useQuery({
    queryKey: ['payments-summary'],
    queryFn: () => paymentsApi.summary(),
    enabled: isPrivileged,
  });

  const payments: OnlinePayment[] = query.data?.pages?.flatMap((p) => p.content) ?? [];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient colors={Gradients.glory} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.heroArt} pointerEvents="none">
          <HandsRaised width={300} height={140} />
        </View>
        <TouchableOpacity
          onPress={() => { haptics.light(); router.back(); }}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Online Giving</Text>
        <Text style={styles.headerSub}>
          {isPrivileged ? 'All Paystack payments in your church' : 'Your Paystack payment history'}
        </Text>

        {/* Leadership summary */}
        {isPrivileged && summary && (
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>THIS MONTH</Text>
              <View style={styles.summaryValueRow}>
                <Text style={styles.summaryCurrency}>GHS</Text>
                <CountUp value={Number(summary.totalThisMonth ?? 0)} style={styles.summaryValue} />
              </View>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>THIS YEAR</Text>
              <View style={styles.summaryValueRow}>
                <Text style={styles.summaryCurrency}>GHS</Text>
                <CountUp value={Number(summary.totalThisYear ?? 0)} style={styles.summaryValue} />
              </View>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>CHANNELS</Text>
              <Text style={styles.summaryChannels}>
                📱 {summary.mobileMoneyCount ?? 0}   💳 {summary.cardCount ?? 0}
              </Text>
            </View>
          </View>
        )}
      </LinearGradient>

      {query.isLoading ? (
        <View style={{ paddingTop: Spacing.md }}>
          {Array.from({ length: 6 }, (_, i) => <AnnouncementSkeleton key={i} />)}
        </View>
      ) : (
        <FlashList
          data={payments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <KlinkCard style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.cardInfo}>
                  <View style={styles.cardTopRow}>
                    <Text style={[styles.amount, { color: Colors.gold }]}>
                      GHS {Number(item.amount).toFixed(2)}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: `${statusColor(item.status)}22`,
                          borderColor: `${statusColor(item.status)}66`,
                        },
                      ]}
                    >
                      <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.typeText, { color: theme.text }]}>
                    {paymentTypeLabel(item.paymentType)}
                    {isPrivileged && item.memberName ? ` · ${item.memberName}` : ''}
                  </Text>
                  <Text style={[styles.metaText, { color: theme.textMuted }]}>
                    {item.channel ? `${item.channel.replace('_', ' ')} · ` : ''}
                    {formatRelativeTime(item.createdAt)}
                  </Text>
                  <Text style={[styles.refText, { color: theme.textMuted }]} numberOfLines={1}>
                    {item.paystackReference}
                  </Text>
                </View>
              </View>
            </KlinkCard>
          )}
          onEndReached={() =>
            query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()
          }
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} tintColor={Colors.gold} />
          }
          contentContainerStyle={{ paddingTop: Spacing.md, paddingBottom: 120 }}
          ListEmptyComponent={
            <EmptyState
              icon="🙌"
              title="No online payments yet"
              subtitle="Give your first tithe or offering today — it takes less than a minute."
              actionLabel="Give now"
              onAction={() => router.push('/giving/pay')}
            />
          }
        />
      )}

      {/* Give FAB */}
      <View style={[styles.fabContainer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          onPress={() => { haptics.medium(); router.push('/giving/pay'); }}
          style={styles.fab}
          accessibilityRole="button"
          accessibilityLabel="Give online now"
        >
          <LinearGradient colors={Gradients.glory} style={styles.fabGradient}>
            <Text style={styles.fabText}>Give Now</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.pagePadding,
    paddingBottom: Spacing.md,
    gap: 4,
    overflow: 'hidden',
    borderBottomLeftRadius: BorderRadius.xxl,
    borderBottomRightRadius: BorderRadius.xxl,
  },
  heroArt: { position: 'absolute', right: -20, bottom: -10, opacity: 0.25 },
  backBtn: { alignSelf: 'flex-start', width: 44, height: 44, justifyContent: 'center' },
  backIcon: { color: Colors.white, fontSize: 32, lineHeight: 34 },
  headerTitle: {
    color: Colors.white,
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.tight,
  },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: FontSize.small },
  summaryRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  summaryCard: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    gap: 2,
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  summaryValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  summaryCurrency: { color: Colors.white, fontSize: FontSize.caption, fontWeight: FontWeight.semiBold },
  summaryValue: { color: Colors.white, fontSize: FontSize.h4, fontWeight: FontWeight.bold },
  summaryChannels: { color: Colors.white, fontSize: FontSize.small, fontWeight: FontWeight.semiBold },
  card: { marginHorizontal: Spacing.pagePadding, marginBottom: Spacing.sm },
  cardRow: { flexDirection: 'row' },
  cardInfo: { flex: 1, gap: 3 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { fontSize: FontSize.h4, fontWeight: FontWeight.bold },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: FontWeight.bold },
  typeText: { fontSize: FontSize.small, fontWeight: FontWeight.semiBold },
  metaText: { fontSize: FontSize.caption },
  refText: { fontSize: 10 },
  fabContainer: { position: 'absolute', right: Spacing.pagePadding, bottom: 0 },
  fab: { borderRadius: BorderRadius.full, overflow: 'hidden' },
  fabGradient: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabText: { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.body },
});
