import React from 'react';
import { RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatCardSkeleton } from '../../src/components/common/KlinkSkeleton';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { givingApi, Payment } from '../../src/api/giving';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { formatCurrency, formatDate } from '../../src/utils/formatters';
import { PAGE_SIZE } from '../../src/utils/constants';
import { StaggerDelay } from '../../src/theme/animations';

export default function GivingHistoryScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch, isRefetching } =
    useInfiniteQuery({
      queryKey: ['giving-history'],
      queryFn: ({ pageParam = 0 }) => givingApi.getMyPayments({ page: pageParam, size: PAGE_SIZE }),
      getNextPageParam: (last) =>
        (last as any).number + 1 < (last as any).totalPages ? (last as any).number + 1 : undefined,
      initialPageParam: 0,
    });

  const payments: Payment[] = data?.pages.flatMap((p) => p.content) ?? [];
  const total = payments.reduce((s, p) => s + p.amount, 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient colors={Gradients.worship} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Giving history</Text>
        <Text style={styles.totalAmount}>{formatCurrency(total)}</Text>
        <Text style={styles.totalLabel}>Total across all time</Text>
      </LinearGradient>

      {isLoading ? (
        <View style={{ paddingTop: Spacing.md }}>
          {Array.from({ length: 8 }, (_, i) => <StatCardSkeleton key={i} />)}
        </View>
      ) : (
        <FlashList
          data={payments}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <PaymentItem payment={item} index={index} theme={theme} />}
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.3}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.gold} />}
          contentContainerStyle={{ paddingTop: Spacing.md, paddingHorizontal: Spacing.pagePadding, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>No giving records yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function PaymentItem({ payment, index, theme }: { payment: Payment; index: number; theme: any }) {
  const typeColor: Record<string, string> = {
    TITHE: Colors.gold,
    OFFERING: Colors.purple,
    WELFARE: Colors.green,
    DUES: Colors.blue,
    SPECIAL_CONTRIBUTION: Colors.roseGold,
  };
  const color = typeColor[payment.paymentType] ?? Colors.darkMuted;

  return (
    <ScrollReveal delay={index * StaggerDelay.fast} style={[styles.paymentItem, { backgroundColor: theme.card }]}>
      <View style={[styles.colorBar, { backgroundColor: color }]} />
      <View style={styles.paymentContent}>
        <Text style={[styles.paymentType, { color: theme.text }]}>
          {payment.paymentType.replace('_', ' ')}
        </Text>
        <Text style={[styles.paymentDate, { color: theme.textMuted }]}>
          {formatDate(payment.paymentDate)} · {payment.paymentMonth}
        </Text>
      </View>
      <View style={styles.paymentRight}>
        <Text style={[styles.paymentAmount, { color }]}>{formatCurrency(payment.amount)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: payment.status === 'CONFIRMED' ? 'rgba(34,197,94,0.15)' : 'rgba(244,164,41,0.15)' }]}>
          <Text style={[styles.statusText, { color: payment.status === 'CONFIRMED' ? Colors.green : Colors.gold }]}>
            {payment.status}
          </Text>
        </View>
      </View>
    </ScrollReveal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.pagePadding, paddingBottom: Spacing.xl, gap: 4 },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  backIcon: { color: Colors.white, fontSize: 32 },
  headerTitle: { color: Colors.white, fontSize: FontSize.h3, fontWeight: FontWeight.bold },
  totalAmount: { color: Colors.gold, fontSize: 40, fontWeight: FontWeight.bold, letterSpacing: LetterSpacing.tightest },
  totalLabel: { color: 'rgba(255,255,255,0.5)', fontSize: FontSize.small },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    minHeight: 60,
  },
  colorBar: { width: 4, alignSelf: 'stretch' },
  paymentContent: { flex: 1, padding: Spacing.md, gap: 3 },
  paymentType: { fontSize: FontSize.body, fontWeight: FontWeight.medium, textTransform: 'capitalize' },
  paymentDate: { fontSize: FontSize.caption },
  paymentRight: { padding: Spacing.md, alignItems: 'flex-end', gap: 4 },
  paymentAmount: { fontSize: FontSize.body, fontWeight: FontWeight.bold },
  statusBadge: { borderRadius: BorderRadius.full, paddingHorizontal: 6, paddingVertical: 2 },
  statusText: { fontSize: FontSize.micro, fontWeight: FontWeight.semiBold },
  empty: { padding: Spacing.xxxl, alignItems: 'center' },
  emptyText: { fontSize: FontSize.body },
});
